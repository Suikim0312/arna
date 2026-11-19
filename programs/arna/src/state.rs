use anchor_lang::prelude::*;

use crate::{constants::*, error::ArnaError};

/// Целевой кошелёк. PDA: ["wallet", owner, id].
/// Владелец (донор) задаёт правила, распорядитель тратит только по ним.
#[account]
#[derive(InitSpace)]
pub struct PurposeWallet {
    pub owner: Pubkey,
    pub spender: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub id: u64,
    #[max_len(MAX_NAME_LEN)]
    pub name: String,
    pub total_deposited: u64,
    pub total_spent: u64,
    pub total_refunded: u64,
    pub spend_count: u64,
    pub category_count: u8,
    pub merchant_count: u16,
    pub paused: bool,
    pub created_at: i64,
    pub bump: u8,
}

/// Категория трат с лимитом. PDA: ["category", wallet, index].
/// period = 0: лимит на всё время; period > 0: лимит обновляется каждые period секунд.
#[account]
#[derive(InitSpace)]
pub struct Category {
    pub wallet: Pubkey,
    pub index: u8,
    #[max_len(MAX_NAME_LEN)]
    pub name: String,
    pub limit: u64,
    pub period: i64,
    pub period_start: i64,
    pub spent_in_period: u64,
    pub total_spent: u64,
    pub bump: u8,
}

impl Category {
    /// Сбрасывает счётчик, если начался новый период. Возвращает true, если был сброс.
    pub fn roll_period(&mut self, now: i64) -> bool {
        if self.period <= 0 || now < self.period_start {
            return false;
        }
        let elapsed = now - self.period_start;
        if elapsed >= self.period {
            // Новый период начинается на границе, кратной period, чтобы не «плыть».
            self.period_start = now - (elapsed % self.period);
            self.spent_in_period = 0;
            return true;
        }
        false
    }

    pub fn remaining(&self) -> u64 {
        self.limit.saturating_sub(self.spent_in_period)
    }
}

/// Разрешённый получатель. PDA: ["merchant", wallet, recipient].
#[account]
#[derive(InitSpace)]
pub struct Merchant {
    pub wallet: Pubkey,
    pub recipient: Pubkey,
    pub category: u8,
    #[max_len(MAX_NAME_LEN)]
    pub name: String,
    pub active: bool,
    pub total_received: u64,
    pub bump: u8,
}

/// Запись о трате — публичный чек. PDA: ["spend", wallet, index].
#[account]
#[derive(InitSpace)]
pub struct SpendRecord {
    pub wallet: Pubkey,
    pub index: u64,
    pub spender: Pubkey,
    pub merchant: Pubkey,
    pub recipient: Pubkey,
    pub category: u8,
    pub amount: u64,
    #[max_len(MAX_MEMO_LEN)]
    pub memo: String,
    pub timestamp: i64,
    pub bump: u8,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cat(period: i64, start: i64, spent: u64) -> Category {
        Category {
            wallet: Pubkey::default(),
            index: 0,
            name: "Еда".into(),
            limit: 1000,
            period,
            period_start: start,
            spent_in_period: spent,
            total_spent: spent,
            bump: 255,
        }
    }

    #[test]
    fn no_period_never_resets() {
        let mut c = cat(0, 0, 900);
        assert!(!c.roll_period(10_000_000));
        assert_eq!(c.remaining(), 100);
    }

    #[test]
    fn resets_on_new_period_and_keeps_grid() {
        let mut c = cat(100, 1_000, 900);
        assert!(!c.roll_period(1_099));
        assert_eq!(c.spent_in_period, 900);
        assert!(c.roll_period(1_250)); // прошло 2,5 периода
        assert_eq!(c.spent_in_period, 0);
        assert_eq!(c.period_start, 1_200); // граница сетки, а не «сейчас»
        assert_eq!(c.total_spent, 900); // общая сумма не теряется
    }

    #[test]
    fn names_and_memos_are_validated() {
        assert!(validate_name("Еда").is_ok());
        assert!(validate_name("  ").is_err());
        assert!(validate_name(&"я".repeat(25)).is_err()); // 50 байт > 48
        assert!(validate_memo("Обед").is_ok());
        assert!(validate_memo("").is_err());
        assert!(validate_memo(&"a".repeat(97)).is_err());
    }
}

pub fn validate_name(name: &str) -> Result<()> {
    require!(!name.trim().is_empty(), ArnaError::NameEmpty);
    require!(name.len() <= MAX_NAME_LEN, ArnaError::NameTooLong);
    Ok(())
}

pub fn validate_memo(memo: &str) -> Result<()> {
    require!(!memo.trim().is_empty(), ArnaError::MemoRequired);
    require!(memo.len() <= MAX_MEMO_LEN, ArnaError::MemoTooLong);
    Ok(())
}
