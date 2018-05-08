import React, { Component } from 'react';
import TotalTreats from './TotalTreats.jsx';
import Treats from './Treats.jsx';

class StoreFront extends Component {
  constructor(props) {
    super(props);
    this.state = {
      treats: [
        {
          name: 'Taco',
          quantity: 5,
          pic: '🌮'
        },
        {
          name: 'Lollipop',
          quantity: 2,
          pic: '🍭'
        },
        {
          name: 'Burrito',
          quantity: 2,
          pic: '🌯'
        }
      ],
      totalTreats: 9
    };
  }
  render() {
    return (
      <div>
        <TotalTreats total={this.state.totalTreats} />
        <Treats treats={this.state.treats} />
      </div>
    )
  }
}

export default StoreFront;
