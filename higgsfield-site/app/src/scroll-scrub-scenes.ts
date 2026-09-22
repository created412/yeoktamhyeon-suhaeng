import type {
  ScrollScrubScene,
  ScrollScrubTheme,
} from "@/components/scroll-scrub/scroll-scrub";

export const scrollScrubTheme: ScrollScrubTheme = {
  accent: "#D2493A",
  background: "#0B1426",
  ink: "#F2EFE8",
  muted: "#9AA6B8",
};

export const scrollScrubScenes: ScrollScrubScene[] = [
  {
    body: "오늘의 문제에는 반드시 시작된 시점이 있다. 낡은 지도의 선이 오늘의 빛이 되기까지, 한 학기 동안 하나의 질문을 끝까지 따라간다.",
    clip: "/assets/world/scene-01.mp4",
    id: "scene-01",
    kicker: "역사로 탐구하는 현대 세계",
    label: "과거와 현재",
    mobileClip: "/assets/world/scene-01-mobile.mp4",
    mobilePoster: "/assets/world/scene-01-mobile-poster.png",
    poster: "/assets/world/scene-01-poster.png",
    tags: ["기원 · 과거", "해결 · 현재", "실천 · 미래"],
    title: "역사는 과거와 현재의 끊임없는 대화이다",
    scroll: 2.6,
  },
];
