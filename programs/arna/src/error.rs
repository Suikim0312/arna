use anchor_lang::prelude::*;

#[error_code]
pub enum ArnaError {
    #[msg("Только владелец кошелька может это сделать")]
    NotOwner,
    #[msg("Тратить может только назначенный распорядитель")]
    NotSpender,
    #[msg("Кошелёк на паузе: траты временно запрещены")]
    WalletPaused,
    #[msg("Получатель отключён владельцем")]
    MerchantInactive,
    #[msg("Получатель не относится к этой категории")]
    CategoryMismatch,
    #[msg("Превышен лимит категории")]
    LimitExceeded,
    #[msg("Недостаточно средств в кошельке")]
    InsufficientFunds,
    #[msg("Сумма должна быть больше нуля")]
    ZeroAmount,
    #[msg("Название слишком длинное")]
    NameTooLong,
    #[msg("Название не может быть пустым")]
    NameEmpty,
    #[msg("Назначение платежа слишком длинное")]
    MemoTooLong,
    #[msg("Укажите назначение платежа")]
    MemoRequired,
    #[msg("Достигнуто максимальное количество категорий")]
    TooManyCategories,
    #[msg("Неверный токен для этого кошелька")]
    WrongMint,
    #[msg("Арифметическое переполнение")]
    Overflow,
    #[msg("Период лимита должен быть 0 (без сброса) или от 60 секунд")]
    InvalidPeriod,
}
