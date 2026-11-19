/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/arna.json`.
 */
export type Arna = {
  "address": "BNmuXFFwkmzKLkxb96QvfSr642gVrMXWDTprTVDg2EhJ",
  "metadata": {
    "name": "arna",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Arna: purpose-bound spending wallet on Solana"
  },
  "instructions": [
    {
      "name": "addCategory",
      "docs": [
        "Добавить категорию трат с лимитом (period = 0 — без сброса, иначе в секундах)."
      ],
      "discriminator": [
        185,
        180,
        5,
        133,
        136,
        4,
        113,
        87
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "wallet"
          ]
        },
        {
          "name": "wallet",
          "writable": true
        },
        {
          "name": "category",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "limit",
          "type": "u64"
        },
        {
          "name": "period",
          "type": "i64"
        }
      ]
    },
    {
      "name": "addMerchant",
      "docs": [
        "Добавить разрешённого получателя в категорию."
      ],
      "discriminator": [
        198,
        82,
        166,
        156,
        165,
        93,
        203,
        72
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "wallet"
          ]
        },
        {
          "name": "wallet",
          "writable": true,
          "relations": [
            "category"
          ]
        },
        {
          "name": "category"
        },
        {
          "name": "recipient"
        },
        {
          "name": "merchant",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  114,
                  99,
                  104,
                  97,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              },
              {
                "kind": "account",
                "path": "recipient"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "categoryIndex",
          "type": "u8"
        },
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "createWallet",
      "docs": [
        "Создать целевой кошелёк и его хранилище токенов (ATA, принадлежащий PDA)."
      ],
      "discriminator": [
        82,
        172,
        128,
        18,
        161,
        207,
        88,
        63
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "spender"
        },
        {
          "name": "mint"
        },
        {
          "name": "wallet",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  97,
                  108,
                  108,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Хранилище токенов: ATA, владельцем которого является PDA кошелька."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "wallet"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": "u64"
        },
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "deposit",
      "docs": [
        "Пополнить кошелёк (может кто угодно)."
      ],
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "depositor",
          "writable": true,
          "signer": true
        },
        {
          "name": "wallet",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "wallet"
          ]
        },
        {
          "name": "depositorToken",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "wallet"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "refund",
      "docs": [
        "Вернуть остаток владельцу."
      ],
      "discriminator": [
        2,
        96,
        183,
        251,
        63,
        208,
        46,
        46
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "wallet"
          ]
        },
        {
          "name": "wallet",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "wallet"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "wallet"
          ]
        },
        {
          "name": "ownerToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "setMerchantActive",
      "docs": [
        "Включить или отключить получателя."
      ],
      "discriminator": [
        135,
        200,
        111,
        155,
        7,
        90,
        21,
        169
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "wallet"
          ]
        },
        {
          "name": "wallet",
          "relations": [
            "merchant"
          ]
        },
        {
          "name": "merchant",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  114,
                  99,
                  104,
                  97,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              },
              {
                "kind": "account",
                "path": "merchant.recipient",
                "account": "merchant"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "active",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setPaused",
      "docs": [
        "Поставить кошелёк на паузу или снять с неё."
      ],
      "discriminator": [
        91,
        60,
        125,
        192,
        176,
        225,
        166,
        218
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "wallet"
          ]
        },
        {
          "name": "wallet",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setSpender",
      "docs": [
        "Назначить нового распорядителя."
      ],
      "discriminator": [
        14,
        168,
        189,
        165,
        80,
        157,
        172,
        54
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "wallet"
          ]
        },
        {
          "name": "wallet",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "newSpender",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "spend",
      "docs": [
        "Потратить по правилам: разрешённый получатель, лимит категории, назначение."
      ],
      "discriminator": [
        242,
        205,
        255,
        87,
        101,
        217,
        245,
        57
      ],
      "accounts": [
        {
          "name": "spender",
          "writable": true,
          "signer": true,
          "relations": [
            "wallet"
          ]
        },
        {
          "name": "wallet",
          "writable": true,
          "relations": [
            "merchant",
            "category"
          ]
        },
        {
          "name": "merchant",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  114,
                  99,
                  104,
                  97,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              },
              {
                "kind": "account",
                "path": "recipient"
              }
            ]
          }
        },
        {
          "name": "category",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "wallet"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "wallet"
          ]
        },
        {
          "name": "recipient",
          "relations": [
            "merchant"
          ]
        },
        {
          "name": "recipientToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipient"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "record",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  112,
                  101,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              },
              {
                "kind": "account",
                "path": "wallet.spendCount",
                "account": "purposeWallet"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "memo",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateCategory",
      "docs": [
        "Изменить лимит или период категории."
      ],
      "discriminator": [
        249,
        192,
        204,
        253,
        57,
        132,
        107,
        44
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "wallet"
          ]
        },
        {
          "name": "wallet",
          "relations": [
            "category"
          ]
        },
        {
          "name": "category",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "limit",
          "type": "u64"
        },
        {
          "name": "period",
          "type": "i64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "category",
      "discriminator": [
        242,
        35,
        245,
        232,
        221,
        227,
        98,
        52
      ]
    },
    {
      "name": "merchant",
      "discriminator": [
        71,
        235,
        30,
        40,
        231,
        21,
        32,
        64
      ]
    },
    {
      "name": "purposeWallet",
      "discriminator": [
        222,
        15,
        235,
        162,
        80,
        150,
        230,
        114
      ]
    },
    {
      "name": "spendRecord",
      "discriminator": [
        12,
        165,
        83,
        16,
        159,
        149,
        25,
        64
      ]
    }
  ],
  "events": [
    {
      "name": "categoryAdded",
      "discriminator": [
        220,
        155,
        15,
        70,
        165,
        216,
        169,
        117
      ]
    },
    {
      "name": "categoryUpdated",
      "discriminator": [
        127,
        35,
        182,
        218,
        11,
        225,
        65,
        230
      ]
    },
    {
      "name": "deposited",
      "discriminator": [
        111,
        141,
        26,
        45,
        161,
        35,
        100,
        57
      ]
    },
    {
      "name": "merchantAdded",
      "discriminator": [
        16,
        98,
        130,
        52,
        170,
        222,
        81,
        51
      ]
    },
    {
      "name": "merchantToggled",
      "discriminator": [
        126,
        15,
        173,
        59,
        64,
        243,
        49,
        221
      ]
    },
    {
      "name": "refunded",
      "discriminator": [
        35,
        103,
        149,
        246,
        196,
        123,
        221,
        99
      ]
    },
    {
      "name": "spenderChanged",
      "discriminator": [
        245,
        190,
        41,
        17,
        217,
        121,
        139,
        187
      ]
    },
    {
      "name": "spent",
      "discriminator": [
        43,
        51,
        164,
        100,
        191,
        244,
        174,
        98
      ]
    },
    {
      "name": "walletCreated",
      "discriminator": [
        159,
        189,
        177,
        30,
        192,
        157,
        229,
        179
      ]
    },
    {
      "name": "walletPausedChanged",
      "discriminator": [
        119,
        93,
        157,
        223,
        234,
        120,
        188,
        142
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notOwner",
      "msg": "Только владелец кошелька может это сделать"
    },
    {
      "code": 6001,
      "name": "notSpender",
      "msg": "Тратить может только назначенный распорядитель"
    },
    {
      "code": 6002,
      "name": "walletPaused",
      "msg": "Кошелёк на паузе: траты временно запрещены"
    },
    {
      "code": 6003,
      "name": "merchantInactive",
      "msg": "Получатель отключён владельцем"
    },
    {
      "code": 6004,
      "name": "categoryMismatch",
      "msg": "Получатель не относится к этой категории"
    },
    {
      "code": 6005,
      "name": "limitExceeded",
      "msg": "Превышен лимит категории"
    },
    {
      "code": 6006,
      "name": "insufficientFunds",
      "msg": "Недостаточно средств в кошельке"
    },
    {
      "code": 6007,
      "name": "zeroAmount",
      "msg": "Сумма должна быть больше нуля"
    },
    {
      "code": 6008,
      "name": "nameTooLong",
      "msg": "Название слишком длинное"
    },
    {
      "code": 6009,
      "name": "nameEmpty",
      "msg": "Название не может быть пустым"
    },
    {
      "code": 6010,
      "name": "memoTooLong",
      "msg": "Назначение платежа слишком длинное"
    },
    {
      "code": 6011,
      "name": "memoRequired",
      "msg": "Укажите назначение платежа"
    },
    {
      "code": 6012,
      "name": "tooManyCategories",
      "msg": "Достигнуто максимальное количество категорий"
    },
    {
      "code": 6013,
      "name": "wrongMint",
      "msg": "Неверный токен для этого кошелька"
    },
    {
      "code": 6014,
      "name": "overflow",
      "msg": "Арифметическое переполнение"
    },
    {
      "code": 6015,
      "name": "invalidPeriod",
      "msg": "Период лимита должен быть 0 (без сброса) или от 60 секунд"
    }
  ],
  "types": [
    {
      "name": "category",
      "docs": [
        "Категория трат с лимитом. PDA: [\"category\", wallet, index].",
        "period = 0: лимит на всё время; period > 0: лимит обновляется каждые period секунд."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "limit",
            "type": "u64"
          },
          {
            "name": "period",
            "type": "i64"
          },
          {
            "name": "periodStart",
            "type": "i64"
          },
          {
            "name": "spentInPeriod",
            "type": "u64"
          },
          {
            "name": "totalSpent",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "categoryAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "limit",
            "type": "u64"
          },
          {
            "name": "period",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "categoryUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "limit",
            "type": "u64"
          },
          {
            "name": "period",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "deposited",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "merchant",
      "docs": [
        "Разрешённый получатель. PDA: [\"merchant\", wallet, recipient]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "category",
            "type": "u8"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "totalReceived",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "merchantAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "category",
            "type": "u8"
          },
          {
            "name": "name",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "merchantToggled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "active",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "purposeWallet",
      "docs": [
        "Целевой кошелёк. PDA: [\"wallet\", owner, id].",
        "Владелец (донор) задаёт правила, распорядитель тратит только по ним."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "spender",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "totalDeposited",
            "type": "u64"
          },
          {
            "name": "totalSpent",
            "type": "u64"
          },
          {
            "name": "totalRefunded",
            "type": "u64"
          },
          {
            "name": "spendCount",
            "type": "u64"
          },
          {
            "name": "categoryCount",
            "type": "u8"
          },
          {
            "name": "merchantCount",
            "type": "u16"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "refunded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "spendRecord",
      "docs": [
        "Запись о трате — публичный чек. PDA: [\"spend\", wallet, index]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "spender",
            "type": "pubkey"
          },
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "category",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "memo",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "spenderChanged",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "old",
            "type": "pubkey"
          },
          {
            "name": "new",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "spent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "category",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "memo",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "walletCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "spender",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "walletPausedChanged",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "paused",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "categorySeed",
      "type": "bytes",
      "value": "[99, 97, 116, 101, 103, 111, 114, 121]"
    },
    {
      "name": "merchantSeed",
      "type": "bytes",
      "value": "[109, 101, 114, 99, 104, 97, 110, 116]"
    },
    {
      "name": "spendSeed",
      "type": "bytes",
      "value": "[115, 112, 101, 110, 100]"
    },
    {
      "name": "walletSeed",
      "type": "bytes",
      "value": "[119, 97, 108, 108, 101, 116]"
    }
  ]
};
