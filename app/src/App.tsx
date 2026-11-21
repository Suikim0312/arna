import { BaseWalletMultiButton } from "@solana/wallet-adapter-react-ui";

const WALLET_LABELS = {
  "change-wallet": "Әмиянды ауыстыру",
  connecting: "Қосылуда…",
  "copy-address": "Мекенжайды көшіру",
  copied: "Көшірілді",
  disconnect: "Ажырату",
  "has-wallet": "Қосу",
  "no-wallet": "Қосу",
} as const;
import { Logo } from "./components/ui";
import { useRoute } from "./lib/router";
import { useSession } from "./lib/session";
import { ROLES, demoWallet } from "./lib/demo";
import { NETWORKS, type NetworkId } from "./config";
import Landing from "./pages/Landing";
import Demo from "./pages/Demo";
import CreateWallet from "./pages/CreateWallet";
import WalletView from "./pages/WalletView";
import Mine from "./pages/Mine";

function RoleBar() {
  const { demoRole, setDemoRole } = useSession();
  if (!demoWallet() && !demoRole) return null;
  const signers = ROLES.filter((r) => r.canSign);
  return (
    <div className="rolebar" role="group" aria-label="Демо рөлі">
      <span className="rb-label">Демо: әрекет етуші</span>
      {signers.map((r) => (
        <button key={r.id} aria-pressed={demoRole === r.id} onClick={() => setDemoRole(r.id)}>
          {r.title}
        </button>
      ))}
      <button aria-pressed={demoRole === null} onClick={() => setDemoRole(null)}>
        Бақылаушы
      </button>
    </div>
  );
}

export default function App() {
  const { page, param } = useRoute();
  const { network, setNetwork, demoRole } = useSession();

  let view;
  if (page === "demo") view = <Demo />;
  else if (page === "new") view = <CreateWallet />;
  else if (page === "w" && param) view = <WalletView address={param} />;
  else if (page === "mine") view = <Mine />;
  else view = <Landing />;

  return (
    <>
      <header className="top">
        <div className="wrap">
          <a className="logo" href="#/">
            <Logo /> Arna
          </a>
          <nav aria-label="Бөлімдер">
            <a href="#/demo" aria-current={page === "demo" ? "page" : undefined}>
              Демо
            </a>
            <a href="#/new" aria-current={page === "new" ? "page" : undefined}>
              Жаңа әмиян
            </a>
            <a href="#/mine" aria-current={page === "mine" ? "page" : undefined}>
              Менің әмияндарым
            </a>
          </nav>
          <div className="spacer" />
          <label className="sr-only" htmlFor="net" style={{ position: "absolute", left: -9999 }}>
            Желі
          </label>
          <select id="net" className="net" value={network} onChange={(e) => setNetwork(e.target.value as NetworkId)}>
            {(Object.keys(NETWORKS) as NetworkId[]).map((n) => (
              <option key={n} value={n}>
                {NETWORKS[n].label}
              </option>
            ))}
          </select>
          {demoRole ? null : <BaseWalletMultiButton labels={WALLET_LABELS} />}
        </div>
      </header>
      <RoleBar />
      <main>{view}</main>
      <footer className="foot">
        <div className="wrap">
          <span>Arna — Solana-дағы мақсатты әмиян. Solana Builders курсының оқу жобасы, AlmaU.</span>
          <span>Сынақ желісі: нақты ақша қолданылмайды.</span>
        </div>
      </footer>
    </>
  );
}
