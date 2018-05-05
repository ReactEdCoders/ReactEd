const qfgets = require('qfgets');
import * as fs from 'fs';
function grepWithMe (line: string, regex: RegExp): string{
  let result: string;
  let temp: string;
  if (regex.exec(line)) {
    temp = regex.exec(line)[0];
    result = temp.replace('_', '').replace('2', '').replace('(', '').replace('.default', '');
  }
  return result;
}

export default class TraverseWebpack {
  grepWithFs( filename: string, regexp1: string, regexp2: RegExp, regexp3: RegExp, regexp4: RegExp ) {
		let fp = new qfgets(filename);
		let contObj: any;
		contObj = {};
		let lineArr: any;
		lineArr = [];
		let currentClass: string = '';
		function loop() {
			for (let i=0; i<40; i++) {
				let line = fp.fgets();
				if (line.match(regexp1)) {
					currentClass = '';
				} else if (regexp2.exec(line)) { // Get Class
					let cleanClass = grepWithMe(line, /(?!_createClass)+\([A-Z][A-Za-z]*/);
					if (!contObj[cleanClass]) {
					contObj[cleanClass] = {props: [], parent: null};
					}
					currentClass = cleanClass;
                } else if (regexp3.exec(line)) { //  Dumb Components
				let dumbComp = grepWithMe(line, /[A-Z][A-Za-z]*/);
				if (!contObj[dumbComp]) {
					contObj[dumbComp] = {props: [], parent: null};
					}
					currentClass = dumbComp;
				} else if (regexp4.exec(line)) { // Component Creation with Props
					let elementItem = grepWithMe(line, /(?!_react2.default.createElement)\(_[A-Z][A-Za-z]*/);
					let elementProps = grepWithMe(line, /\{.+\}/);
					if (!elementProps) {
						elementProps = "null";
					}
					if (!contObj[elementItem]) {
						contObj[elementItem] = {props: [], parent: null};
					}
					if (currentClass !== '') {
						contObj[elementItem].parent = currentClass;
					}
					elementProps = elementProps.replace('{','').replace('}','').replace(' ', '');
					let propArr = elementProps.split(/,|:/g);
					let initObj: any = {};
					for (let i = 0; i < propArr.length - 1; i += 2) {
						let propsReg = /props.[A-Za-z]*|state.[A-Za-z]*/;
						if (propsReg.exec(propArr[i+1])) {
						let val = grepWithMe(propArr[i+1], /props.[A-Za-z]*|state.[A-Za-z]*/);
						initObj[propArr[i].trim()] = val
						} else {
						initObj[propArr[i].trim()] = propArr[i+1].trim();
						}
					}
					let propKeys = Object.keys(initObj);
					for (let i = 0; i < propKeys.length; i++) {
					if (!initObj[propKeys[i]].includes('props') && !initObj[propKeys[i]].includes('state')) {
							let lineArrInd = 0;
							while(!lineArr[lineArrInd].includes('props') && !lineArr[lineArrInd].includes('state') && lineArrInd < 3) {
								lineArrInd++;
							}
							if (lineArrInd < 3) {
							let prop = grepWithMe(lineArr[lineArrInd], /props.[A-Za-z]*|state.[A-Za-z]*/);
							initObj[propKeys[i]] = prop;
							}
						}
					}
					contObj[elementItem].props = initObj;
		}
		lineArr.unshift(line);
		if (lineArr.length > 4) {
			lineArr.pop();
		}
			}
		
			if (!fp.feof()) setImmediate(loop);
			fs.writeFile(__dirname + '/../../../server/src/componentTree.json', JSON.stringify(contObj), (err: any) => {
				if (err) console.log(err);
			});
		}
		loop();
	}
}