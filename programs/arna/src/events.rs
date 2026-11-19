use anchor_lang::prelude::*;

#[event]
pub struct WalletCreated {
    pub wallet: Pubkey,
    pub owner: Pubkey,
    pub spender: Pubkey,
    pub mint: Pubkey,
    pub name: String,
}

#[event]
pub struct CategoryAdded {
    pub wallet: Pubkey,
    pub index: u8,
    pub name: String,
    pub limit: u64,
    pub period: i64,
}

#[event]
pub struct CategoryUpdated {
    pub wallet: Pubkey,
    pub index: u8,
    pub limit: u64,
    pub period: i64,
}

#[event]
pub struct MerchantAdded {
    pub wallet: Pubkey,
    pub merchant: Pubkey,
    pub recipient: Pubkey,
    pub category: u8,
    pub name: String,
}

#[event]
pub struct MerchantToggled {
    pub merchant: Pubkey,
    pub active: bool,
}

#[event]
pub struct WalletPausedChanged {
    pub wallet: Pubkey,
    pub paused: bool,
}

#[event]
pub struct SpenderChanged {
    pub wallet: Pubkey,
    pub old: Pubkey,
    pub new: Pubkey,
}

#[event]
pub struct Deposited {
    pub wallet: Pubkey,
    pub depositor: Pubkey,
    pub amount: u64,
}

#[event]
pub struct Spent {
    pub wallet: Pubkey,
    pub index: u64,
    pub merchant: Pubkey,
    pub recipient: Pubkey,
    pub category: u8,
    pub amount: u64,
    pub memo: String,
}

#[event]
pub struct Refunded {
    pub wallet: Pubkey,
    pub amount: u64,
}
