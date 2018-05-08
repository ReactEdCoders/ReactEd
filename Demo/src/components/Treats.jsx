import React from 'react';
import Treat from './Treat.jsx';

const Treats = props => {
    const treats = [];
    props.treats.forEach(item => {
      treats.push(<Treat info={item} />)
    });
    return (
    <div id='treats'>
      {treats}
    </div>
    )
}

export default Treats;
