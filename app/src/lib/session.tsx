import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import type { Wallet } from "@anchor-lang/core";
import { NETWORKS, type NetworkId } from "../config";
import { makeProgram, type ArnaProgram } from "./arna";
import { demoKey, keypairWallet, type RoleId } from "./demo";

interface Session {
  network: NetworkId;
  setNetwork: (n: NetworkId) => void;
  connection: Connection;
  /** Кто сейчас подписывает: внешний кошелёк или демо-роль. */
  signer: Wallet | null;
  me: PublicKey | null;
  demoRole: RoleId | null;
  setDemoRole: (r: RoleId | null) => void;
  program: ArnaProgram;
  /** Увеличивается после каждой транзакции — страницы перечитывают данные. */
  tick: number;
  bump: () => void;
}

const Ctx = createContext<Session | null>(null);

function initialNetwork(): NetworkId {
  try {
    const saved = localStorage.getItem("arna.network");
    if (saved === "devnet" || saved === "localnet") return saved;
  } catch {
    /* ignore */
  }
  return "localnet";
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<NetworkId>(initialNetwork);
  const [demoRole, setDemoRole] = useState<RoleId | null>(null);
  const [tick, setTick] = useState(0);
  const external = useAnchorWallet();

  const connection = useMemo(() => new Connection(NETWORKS[network].url, "confirmed"), [network]);

  const signer: Wallet | null = useMemo(() => {
    if (demoRole) return keypairWallet(demoKey(demoRole));
    return (external as Wallet | undefined) ?? null;
  }, [demoRole, external]);

  const program = useMemo(() => makeProgram(connection, signer), [connection, signer]);

  const setNetwork = useCallback((n: NetworkId) => {
    setNetworkState(n);
    try {
      localStorage.setItem("arna.network", n);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (external && demoRole) setDemoRole(null);
    // при подключении настоящего кошелька демо-роль выключается
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [external?.publicKey?.toBase58()]);

  const value: Session = {
    network,
    setNetwork,
    connection,
    signer,
    me: signer?.publicKey ?? null,
    demoRole,
    setDemoRole,
    program,
    tick,
    bump: () => setTick((t) => t + 1),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error("SessionProvider missing");
  return s;
}
