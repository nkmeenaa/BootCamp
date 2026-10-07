import InkCanvas from "./components/InkCanvas";
import "./App.css";

function App(){
  return (
    <div className="app">
      <main className="workspace">
        <header className="app-header">
          <div>
            <p className="eyebrow">Smart handwriting workspace</p>
            <h1><span>Just Write It.</span></h1>
            <p className="subtitle">Put your calculation on paper and let CalcInk handle the answer.</p>
          </div>
          <div className="header-status">
            <span className="status-dot" aria-hidden="true" />
            Ready to write
          </div>
        </header>
        <InkCanvas />
      </main>
    </div>
  );
}
export default App;
