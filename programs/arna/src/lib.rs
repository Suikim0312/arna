//! Arna — целевой кошелёк на Solana.
//!
//! Деньги, которые знают своё назначение: владелец (донор) кладёт токены
//! в кошелёк и задаёт правила — категории с лимитами и список разрешённых
//! получателей. Распорядитель может тратить только по этим правилам, а каждая
//! трата сохраняется в блокчейне как публичный чек.

pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("BNmuXFFwkmzKLkxb96QvfSr642gVrMXWDTprTVDg2EhJ");

#[program]
pub mod arna {
    use super::*;

    /// Создать целевой кошелёк и его хранилище токенов (ATA, принадлежащий PDA).
    pub fn create_wallet(ctx: Context<CreateWallet>, id: u64, name: String) -> Result<()> {
        instructions::admin::handle_create_wallet(ctx, id, name)
    }

    /// Добавить категорию трат с лимитом (period = 0 — без сброса, иначе в секундах).
    pub fn add_category(ctx: Context<AddCategory>, name: String, limit: u64, period: i64) -> Result<()> {
        instructions::admin::handle_add_category(ctx, name, limit, period)
    }

    /// Изменить лимит или период категории.
    pub fn update_category(ctx: Context<UpdateCategory>, limit: u64, period: i64) -> Result<()> {
        instructions::admin::handle_update_category(ctx, limit, period)
    }

    /// Добавить разрешённого получателя в категорию.
    pub fn add_merchant(ctx: Context<AddMerchant>, category_index: u8, name: String) -> Result<()> {
        instructions::admin::handle_add_merchant(ctx, category_index, name)
    }

    /// Включить или отключить получателя.
    pub fn set_merchant_active(ctx: Context<SetMerchantActive>, active: bool) -> Result<()> {
        instructions::admin::handle_set_merchant_active(ctx, active)
    }

    /// Поставить кошелёк на паузу или снять с неё.
    pub fn set_paused(ctx: Context<OwnerOnly>, paused: bool) -> Result<()> {
        instructions::admin::handle_set_paused(ctx, paused)
    }

    /// Назначить нового распорядителя.
    pub fn set_spender(ctx: Context<OwnerOnly>, new_spender: Pubkey) -> Result<()> {
        instructions::admin::handle_set_spender(ctx, new_spender)
    }

    /// Пополнить кошелёк (может кто угодно).
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::funds::handle_deposit(ctx, amount)
    }

    /// Потратить по правилам: разрешённый получатель, лимит категории, назначение.
    pub fn spend(ctx: Context<Spend>, amount: u64, memo: String) -> Result<()> {
        instructions::funds::handle_spend(ctx, amount, memo)
    }

    /// Вернуть остаток владельцу.
    pub fn refund(ctx: Context<Refund>, amount: u64) -> Result<()> {
        instructions::funds::handle_refund(ctx, amount)
    }
}
