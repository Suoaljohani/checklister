import { Suspense } from "react";
import { NewsFeed } from "./news-feed";

export const metadata = {
  title: "News",
  description: "News and updates for the Emergency Department.",
};

export default function NewsPage() {
  return (
    <Suspense>
      <NewsFeed />
    </Suspense>
  );
}
