import React, { Component } from 'react';
import './App.css';
import StoreFront from './components/StoreFront.jsx';

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Tasty Treats</h1>
        </header>
        <StoreFront />
      </div>
    );
  }
}

export default App;
