import { createFileRoute, Link } from "@tanstack/react-router";

import { ScrollScrub } from "@/components/scroll-scrub/scroll-scrub";
import "@/components/site/site.css";
import { scrollScrubScenes, scrollScrubTheme } from "@/scroll-scrub-scenes";

export const Route = createFileRoute("/")({
  component: Index,
});

const TASKS = [
  { no: "1", t: "현대 세계의 과제 탐구하기", d: "진로와 이어 주제를 고르고, 실태를 자료로 확인하고, 세 갈래 질문을 세운다.", open: true },
  { no: "2", t: "기원을 사료로 캐기", d: "내 주제가 시작된 시점을 사료로 확인한다.", open: false },
  { no: "3", t: "해결 노력의 한계 따지기", d: "지금까지의 해결 노력이 어디서 멈췄는지 따진다.", open: false },
  { no: "4", t: "실천 방안 만들기", d: "기원과 한계를 근거로 나의 실천을 설계한다.", open: false },
];

function Index() {
  return (
    <main className="yt yt-dark">
      <nav className="yt-nav">
        <span className="yt-brand">
          <span className="yt-seal">역</span>역탐현 수행평가
        </span>
        <Link to="/s1">수행평가 1 제출</Link>
      </nav>
      <ScrollScrub scenes={scrollScrubScenes} theme={scrollScrubTheme} />
      <section className="yt-section" id="tasks">
        <h2 className="yt-h2">한 학기, 하나의 질문</h2>
        <p className="yt-lead">
          워크북 1에서 정한 주제로 남은 세 번의 수행평가를 모두 치른다. 주제를 고르는 일이 곧 학기 전체를 고르는 일이다.
        </p>
        <Link to="/s1" className="yt-go">
          수행평가 1 제출하러 가기 →
        </Link>
        <div className="yt-tasks">
          {TASKS.map((x) =>
            x.open ? (
              <Link key={x.no} to="/s1" className="yt-task">
                <span className="no">{x.no}</span>
                <span className="t">{x.t}</span>
                <span className="d">{x.d}</span>
                <span className="tag">제출 · 9/22(화) 오후 7시 마감</span>
              </Link>
            ) : (
              <div key={x.no} className="yt-task off">
                <span className="no">{x.no}</span>
                <span className="t">{x.t}</span>
                <span className="d">{x.d}</span>
                <span className="tag">준비 중</span>
              </div>
            ),
          )}
        </div>
      </section>
      <footer className="yt-foot">
        역사는 과거와 현재의 끊임없는 대화이다. E. H. 카 · <Link to="/teacher">교사용 열람</Link>
      </footer>
    </main>
  );
}
