use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::{constants::*, error::ArnaError, events::*, state::*};

// ───────────────────────── create_wallet ─────────────────────────

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct CreateWallet<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: распорядитель — любой адрес, подпись при создании не нужна.
    pub spender: UncheckedAccount<'info>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        payer = owner,
        space = 8 + PurposeWallet::INIT_SPACE,
        seeds = [WALLET_SEED, owner.key().as_ref(), &id.to_le_bytes()],
        bump
    )]
    pub wallet: Box<Account<'info, PurposeWallet>>,

    /// Хранилище токенов: ATA, владельцем которого является PDA кошелька.
    #[account(
        init,
        payer = owner,
        associated_token::mint = mint,
        associated_token::authority = wallet,
        associated_token::token_program = token_program,
    )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handle_create_wallet(ctx: Context<CreateWallet>, id: u64, name: String) -> Result<()> {
    validate_name(&name)?;
    let now = Clock::get()?.unix_timestamp;
    let w = &mut ctx.accounts.wallet;
    w.owner = ctx.accounts.owner.key();
    w.spender = ctx.accounts.spender.key();
    w.mint = ctx.accounts.mint.key();
    w.vault = ctx.accounts.vault.key();
    w.id = id;
    w.name = name.clone();
    w.total_deposited = 0;
    w.total_spent = 0;
    w.total_refunded = 0;
    w.spend_count = 0;
    w.category_count = 0;
    w.merchant_count = 0;
    w.paused = false;
    w.created_at = now;
    w.bump = ctx.bumps.wallet;

    emit!(WalletCreated {
        wallet: w.key(),
        owner: w.owner,
        spender: w.spender,
        mint: w.mint,
        name,
    });
    Ok(())
}

// ───────────────────────── add_category ─────────────────────────

#[derive(Accounts)]
pub struct AddCategory<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, has_one = owner @ ArnaError::NotOwner)]
    pub wallet: Box<Account<'info, PurposeWallet>>,

    #[account(
        init,
        payer = owner,
        space = 8 + Category::INIT_SPACE,
        seeds = [CATEGORY_SEED, wallet.key().as_ref(), &[wallet.category_count]],
        bump
    )]
    pub category: Box<Account<'info, Category>>,

    pub system_program: Program<'info, System>,
}

pub fn handle_add_category(
    ctx: Context<AddCategory>,
    name: String,
    limit: u64,
    period: i64,
) -> Result<()> {
    validate_name(&name)?;
    require!(limit > 0, ArnaError::ZeroAmount);
    require!(period == 0 || period >= 60, ArnaError::InvalidPeriod);
    let wallet = &mut ctx.accounts.wallet;
    require!(wallet.category_count < MAX_CATEGORIES, ArnaError::TooManyCategories);

    let c = &mut ctx.accounts.category;
    c.wallet = wallet.key();
    c.index = wallet.category_count;
    c.name = name.clone();
    c.limit = limit;
    c.period = period;
    c.period_start = Clock::get()?.unix_timestamp;
    c.spent_in_period = 0;
    c.total_spent = 0;
    c.bump = ctx.bumps.category;

    wallet.category_count = wallet.category_count.checked_add(1).ok_or(ArnaError::Overflow)?;

    emit!(CategoryAdded { wallet: wallet.key(), index: c.index, name, limit, period });
    Ok(())
}

// ───────────────────────── update_category ─────────────────────────

#[derive(Accounts)]
pub struct UpdateCategory<'info> {
    pub owner: Signer<'info>,

    #[account(has_one = owner @ ArnaError::NotOwner)]
    pub wallet: Box<Account<'info, PurposeWallet>>,

    #[account(
        mut,
        has_one = wallet,
        seeds = [CATEGORY_SEED, wallet.key().as_ref(), &[category.index]],
        bump = category.bump
    )]
    pub category: Box<Account<'info, Category>>,
}

pub fn handle_update_category(ctx: Context<UpdateCategory>, limit: u64, period: i64) -> Result<()> {
    require!(limit > 0, ArnaError::ZeroAmount);
    require!(period == 0 || period >= 60, ArnaError::InvalidPeriod);
    let c = &mut ctx.accounts.category;
    if c.period != period {
        c.period = period;
        c.period_start = Clock::get()?.unix_timestamp;
        c.spent_in_period = 0;
    }
    c.limit = limit;
    emit!(CategoryUpdated { wallet: c.wallet, index: c.index, limit, period });
    Ok(())
}

// ───────────────────────── add_merchant ─────────────────────────

#[derive(Accounts)]
#[instruction(category_index: u8)]
pub struct AddMerchant<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, has_one = owner @ ArnaError::NotOwner)]
    pub wallet: Box<Account<'info, PurposeWallet>>,

    #[account(
        has_one = wallet,
        seeds = [CATEGORY_SEED, wallet.key().as_ref(), &[category_index]],
        bump = category.bump
    )]
    pub category: Box<Account<'info, Category>>,

    /// CHECK: получатель — любой адрес (магазин, школа, аптека).
    pub recipient: UncheckedAccount<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + Merchant::INIT_SPACE,
        seeds = [MERCHANT_SEED, wallet.key().as_ref(), recipient.key().as_ref()],
        bump
    )]
    pub merchant: Box<Account<'info, Merchant>>,

    pub system_program: Program<'info, System>,
}

pub fn handle_add_merchant(ctx: Context<AddMerchant>, category_index: u8, name: String) -> Result<()> {
    validate_name(&name)?;
    let m = &mut ctx.accounts.merchant;
    m.wallet = ctx.accounts.wallet.key();
    m.recipient = ctx.accounts.recipient.key();
    m.category = category_index;
    m.name = name.clone();
    m.active = true;
    m.total_received = 0;
    m.bump = ctx.bumps.merchant;

    let wallet = &mut ctx.accounts.wallet;
    wallet.merchant_count = wallet.merchant_count.checked_add(1).ok_or(ArnaError::Overflow)?;

    emit!(MerchantAdded {
        wallet: wallet.key(),
        merchant: m.key(),
        recipient: m.recipient,
        category: category_index,
        name,
    });
    Ok(())
}

// ───────────────────────── set_merchant_active ─────────────────────────

#[derive(Accounts)]
pub struct SetMerchantActive<'info> {
    pub owner: Signer<'info>,

    #[account(has_one = owner @ ArnaError::NotOwner)]
    pub wallet: Box<Account<'info, PurposeWallet>>,

    #[account(
        mut,
        has_one = wallet,
        seeds = [MERCHANT_SEED, wallet.key().as_ref(), merchant.recipient.as_ref()],
        bump = merchant.bump
    )]
    pub merchant: Box<Account<'info, Merchant>>,
}

pub fn handle_set_merchant_active(ctx: Context<SetMerchantActive>, active: bool) -> Result<()> {
    ctx.accounts.merchant.active = active;
    emit!(MerchantToggled { merchant: ctx.accounts.merchant.key(), active });
    Ok(())
}

// ───────────────────────── set_paused / set_spender ─────────────────────────

#[derive(Accounts)]
pub struct OwnerOnly<'info> {
    pub owner: Signer<'info>,

    #[account(mut, has_one = owner @ ArnaError::NotOwner)]
    pub wallet: Box<Account<'info, PurposeWallet>>,
}

pub fn handle_set_paused(ctx: Context<OwnerOnly>, paused: bool) -> Result<()> {
    ctx.accounts.wallet.paused = paused;
    emit!(WalletPausedChanged { wallet: ctx.accounts.wallet.key(), paused });
    Ok(())
}

pub fn handle_set_spender(ctx: Context<OwnerOnly>, new_spender: Pubkey) -> Result<()> {
    let w = &mut ctx.accounts.wallet;
    let old = w.spender;
    w.spender = new_spender;
    emit!(SpenderChanged { wallet: w.key(), old, new: new_spender });
    Ok(())
}
