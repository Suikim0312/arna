import { Envelope, Stamp, envColor } from "../components/ui";

export default function Landing() {
  return (
    <div className="wrap">
      <section className="hero">
        <div>
          <h1>Не үшін екенін білетін ақша.</h1>
          <p className="lead">
            Ақшаңызды лимиті бар конверттерге және рұқсат етілген алушыларға бөліңіз. Жұмсауға тек ереже бойынша болады,
            ал әр чекті сілтеме берген адамдарыңыз көре алады.
          </p>
          <div className="cta">
            <a className="btn" href="#/demo">
              Мысалмен көру
            </a>
            <a className="btn ghost" href="#/new">
              Әмиян жасау
            </a>
          </div>
        </div>
        <div className="desk" aria-hidden="true">
          <Envelope name="Тамақ" color={envColor(0)} limit={3_000_000} spent={1_160_000} period={604_800} />
          <Envelope name="Оқу" color={envColor(1)} limit={5_000_000} spent={1_850_000} period={0} />
          <Envelope name="Жол жүру" color={envColor(2)} limit={800_000} spent={240_000} period={604_800} />
          <Stamp kind="deny" title="БОЛМАЙДЫ" note="Ойын клубы тізімде жоқ" />
        </div>
      </section>

      <section className="how" aria-label="Қалай жұмыс істейді">
        <article>
          <div className="step">1</div>
          <h3>Ақша салыңыз</h3>
          <p>Әмиян жасап, кім жұмсайтынын белгілеңіз де, толтырыңыз. Толтыруға кез келген адам құқылы.</p>
        </article>
        <article>
          <div className="step">2</div>
          <h3>Ережені белгілеңіз</h3>
          <p>Апта, ай немесе тұтас уақытқа лимиті бар конверттер және әр конвертке арналған алушылар тізімі.</p>
        </article>
        <article>
          <div className="step">3</div>
          <h3>Қайда кеткенін көріңіз</h3>
          <p>Бөтен мекенжай немесе лимиттен асу — бағдарламаның өзі қабылдамайды. Әр шығын чек болып сақталады.</p>
        </article>
      </section>

      <section className="usecases">
        <h2>Бұл кімге арналған</h2>
        <ul>
          <li>
            <b>Ата-аналар мен студенттер</b>
            <span>Ойын клубына емес, тамақ пен оқуға арналған ақша. Күн сайын аударым жасаудың қажеті жоқ.</span>
          </li>
          <li>
            <b>Компаниялар</b>
            <span>Түскі ас, такси немесе оқуға арналған бюджет — басқа жерге жұмсалмайды.</span>
          </li>
          <li>
            <b>Қайырымдылық жинақтары</b>
            <span>Донорлар әр төлемді көреді: кімге, қанша және не үшін.</span>
          </li>
          <li>
            <b>Гранттар мен стипендиялар</b>
            <span>Қаражат тек келісілген баптарға жұмсалады, есеп өзі жиналады.</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
