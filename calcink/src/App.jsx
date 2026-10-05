import { useState } from 'react'

import InkCanvas from './components/InkCanvas'
import './App.css'

function App() {
  return (
    <div className="app">
      <h1>CalcInk</h1>
      <InkCanvas />
    </div>
  );
}
export default App
