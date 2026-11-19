use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{constants::*, error::ArnaError, events::*, state::*};

// ───────────────────────── deposit ─────────────────────────
// Пополнить кошелёк может кто угодно: родитель, компания, жертвователь.

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(mut, has_one = mint @ ArnaError::WrongMint, has_one = vault)]
    pub wallet: Box<Account<'info, PurposeWallet>>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = depositor,
        token::token_program = token_program,
    )]
    pub depositor_token: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handle_deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, ArnaError::ZeroAmount);

    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.depositor_token.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        ),
        amount,
        ctx.accounts.mint.decimals,
    )?;

    let w = &mut ctx.accounts.wallet;
    w.total_deposited = w.total_deposited.checked_add(amount).ok_or(ArnaError::Overflow)?;

    emit!(Deposited { wallet: w.key(), depositor: ctx.accounts.depositor.key(), amount });
    Ok(())
}

// ───────────────────────── spend ─────────────────────────
// Главная инструкция: программа сама проверяет все правила и только потом
// переводит токены из хранилища, подписывая перевод PDA кошелька (invoke_signed).

#[derive(Accounts)]
pub struct Spend<'info> {
    #[account(mut)]
    pub spender: Signer<'info>,

    #[account(
        mut,
        has_one = spender @ ArnaError::NotSpender,
        has_one = mint @ ArnaError::WrongMint,
        has_one = vault,
    )]
    pub wallet: Box<Account<'info, PurposeWallet>>,

    #[account(
        mut,
        has_one = wallet,
        has_one = recipient,
        seeds = [MERCHANT_SEED, wallet.key().as_ref(), recipient.key().as_ref()],
        bump = merchant.bump
    )]
    pub merchant: Box<Account<'info, Merchant>>,

    #[account(
        mut,
        has_one = wallet,
        seeds = [CATEGORY_SEED, wallet.key().as_ref(), &[merchant.category]],
        bump = category.bump
    )]
    pub category: Box<Account<'info, Category>>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: проверяется через has_one = recipient у merchant.
    pub recipient: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = spender,
        associated_token::mint = mint,
        associated_token::authority = recipient,
        associated_token::token_program = token_program,
    )]
    pub recipient_token: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = spender,
        space = 8 + SpendRecord::INIT_SPACE,
        seeds = [SPEND_SEED, wallet.key().as_ref(), &wallet.spend_count.to_le_bytes()],
        bump
    )]
    pub record: Box<Account<'info, SpendRecord>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handle_spend(ctx: Context<Spend>, amount: u64, memo: String) -> Result<()> {
    require!(amount > 0, ArnaError::ZeroAmount);
    validate_memo(&memo)?;
    require!(!ctx.accounts.wallet.paused, ArnaError::WalletPaused);
    require!(ctx.accounts.merchant.active, ArnaError::MerchantInactive);
    require!(
        ctx.accounts.merchant.category == ctx.accounts.category.index,
        ArnaError::CategoryMismatch
    );
    require!(ctx.accounts.vault.amount >= amount, ArnaError::InsufficientFunds);

    let now = Clock::get()?.unix_timestamp;
    let category = &mut ctx.accounts.category;
    category.roll_period(now);
    let new_spent = category.spent_in_period.checked_add(amount).ok_or(ArnaError::Overflow)?;
    require!(new_spent <= category.limit, ArnaError::LimitExceeded);

    // Перевод из хранилища: подписывает PDA кошелька.
    let owner_key = ctx.accounts.wallet.owner;
    let id_bytes = ctx.accounts.wallet.id.to_le_bytes();
    let bump = [ctx.accounts.wallet.bump];
    let signer_seeds: &[&[&[u8]]] = &[&[WALLET_SEED, owner_key.as_ref(), &id_bytes, &bump]];

    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.recipient_token.to_account_info(),
                authority: ctx.accounts.wallet.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
        ctx.accounts.mint.decimals,
    )?;

    let merchant = &mut ctx.accounts.merchant;
    merchant.total_received = merchant.total_received.checked_add(amount).ok_or(ArnaError::Overflow)?;

    category.spent_in_period = new_spent;
    category.total_spent = category.total_spent.checked_add(amount).ok_or(ArnaError::Overflow)?;

    let wallet = &mut ctx.accounts.wallet;
    let index = wallet.spend_count;
    wallet.total_spent = wallet.total_spent.checked_add(amount).ok_or(ArnaError::Overflow)?;
    wallet.spend_count = index.checked_add(1).ok_or(ArnaError::Overflow)?;

    let record = &mut ctx.accounts.record;
    record.wallet = wallet.key();
    record.index = index;
    record.spender = ctx.accounts.spender.key();
    record.merchant = ctx.accounts.merchant.key();
    record.recipient = ctx.accounts.recipient.key();
    record.category = category.index;
    record.amount = amount;
    record.memo = memo.clone();
    record.timestamp = now;
    record.bump = ctx.bumps.record;

    emit!(Spent {
        wallet: wallet.key(),
        index,
        merchant: record.merchant,
        recipient: record.recipient,
        category: record.category,
        amount,
        memo,
    });
    Ok(())
}

// ───────────────────────── refund ─────────────────────────
// Владелец может забрать остаток обратно (например, после окончания программы помощи).

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ ArnaError::NotOwner,
        has_one = mint @ ArnaError::WrongMint,
        has_one = vault,
    )]
    pub wallet: Box<Account<'info, PurposeWallet>>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = mint,
        associated_token::authority = owner,
        associated_token::token_program = token_program,
    )]
    pub owner_token: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handle_refund(ctx: Context<Refund>, amount: u64) -> Result<()> {
    require!(amount > 0, ArnaError::ZeroAmount);
    require!(ctx.accounts.vault.amount >= amount, ArnaError::InsufficientFunds);

    let owner_key = ctx.accounts.wallet.owner;
    let id_bytes = ctx.accounts.wallet.id.to_le_bytes();
    let bump = [ctx.accounts.wallet.bump];
    let signer_seeds: &[&[&[u8]]] = &[&[WALLET_SEED, owner_key.as_ref(), &id_bytes, &bump]];

    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.owner_token.to_account_info(),
                authority: ctx.accounts.wallet.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
        ctx.accounts.mint.decimals,
    )?;

    let w = &mut ctx.accounts.wallet;
    w.total_refunded = w.total_refunded.checked_add(amount).ok_or(ArnaError::Overflow)?;
    emit!(Refunded { wallet: w.key(), amount });
    Ok(())
}
