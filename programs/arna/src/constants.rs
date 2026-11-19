use anchor_lang::prelude::*;

#[constant]
pub const WALLET_SEED: &[u8] = b"wallet";

#[constant]
pub const CATEGORY_SEED: &[u8] = b"category";

#[constant]
pub const MERCHANT_SEED: &[u8] = b"merchant";

#[constant]
pub const SPEND_SEED: &[u8] = b"spend";

/// Максимальная длина названия кошелька, категории, получателя (байты UTF-8, ~24 буквы кириллицей).
pub const MAX_NAME_LEN: usize = 48;

/// Максимальная длина назначения платежа (байты UTF-8, ~48 букв кириллицей).
pub const MAX_MEMO_LEN: usize = 96;

/// Сколько категорий можно завести в одном кошельке.
pub const MAX_CATEGORIES: u8 = 16;
