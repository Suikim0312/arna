import { Envelope, Stamp, envColor } from "../components/ui";

export default function Landing() {
  return (
    <div className="wrap">
      <section className="hero">
        <div>
          <h1>Деньги, которые знают, на что они.</h1>
          <p className="lead">
            Разложите деньги по конвертам с лимитами и разрешёнными получателями. Тратить можно только по правилам, а
            каждый чек виден всем, кому вы дали ссылку.
          </p>
          <div className="cta">
            <a className="btn" href="#/demo">
              Посмотреть на примере
            </a>
            <a className="btn ghost" href="#/new">
              Создать кошелёк
            </a>
          </div>
        </div>
        <div className="desk" aria-hidden="true">
          <Envelope name="Еда" color={envColor(0)} limit={3_000_000} spent={1_160_000} period={604_800} />
          <Envelope name="Учёба" color={envColor(1)} limit={5_000_000} spent={1_850_000} period={0} />
          <Envelope name="Проезд" color={envColor(2)} limit={800_000} spent={240_000} period={604_800} />
          <Stamp kind="deny" title="ОТКЛОНЕНО" note="Игровой клуб нет в списке" />
        </div>
      </section>

      <section className="how" aria-label="Как это работает">
        <article>
          <div className="step">1</div>
          <h3>Положите деньги</h3>
          <p>Создайте кошелёк, назначьте, кто будет тратить, и пополните его. Пополнить может кто угодно.</p>
        </article>
        <article>
          <div className="step">2</div>
          <h3>Задайте правила</h3>
          <p>Конверты с лимитами — на неделю, месяц или всё время — и список получателей для каждого конверта.</p>
        </article>
        <article>
          <div className="step">3</div>
          <h3>Смотрите, куда ушло</h3>
          <p>Чужой адрес или превышение лимита программа отклонит сама. Каждая трата сохраняется как чек.</p>
        </article>
      </section>

      <section className="usecases">
        <h2>Для кого это</h2>
        <ul>
          <li>
            <b>Родители и студенты</b>
            <span>Деньги на еду и учёбу, а не на игровой клуб. Без ежедневных переводов.</span>
          </li>
          <li>
            <b>Компании</b>
            <span>Бюджет на обеды, такси или обучение, который нельзя потратить мимо.</span>
          </li>
          <li>
            <b>Благотворительные сборы</b>
            <span>Жертвователи видят каждый платёж: кому, сколько и зачем.</span>
          </li>
          <li>
            <b>Гранты и стипендии</b>
            <span>Средства идут только на согласованные статьи, отчёт собирается сам.</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
