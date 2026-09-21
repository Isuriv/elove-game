import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { HomePage } from "./pages/HomePage";
import { MindPage } from "./pages/MindPage";
import { StoryPage } from "./pages/StoryPage";
import { StrategyPage } from "./pages/StrategyPage";
import { useTitle } from "./useTitle";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<HomePage />} />
          <Route path="strategy" element={<StrategyPage />} />
          <Route path="story" element={<StoryPage />} />
          <Route path="mind" element={<MindPage />} />
          <Route path="*" element={<Missing />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function Missing() {
  useTitle("Off the chart — Dark Matter");
  return (
    <div className="page narrow">
      <p className="eyebrow">Uncharted</p>
      <h1>Off the chart</h1>
      <p className="lede">That heading was never surveyed.</p>
      <Link className="btn btn-primary" to="/">
        Return to Dark Matter
      </Link>
    </div>
  );
}
