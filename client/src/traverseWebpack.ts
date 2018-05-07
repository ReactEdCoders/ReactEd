const qfgets = require("qfgets");
import * as fs from "fs";
/* cleans grepped lines by applying regex */
function regWithMe(line: string, regex: RegExp): string {
  let result: string;
  let temp: string;
  if (regex.exec(line)) {
    temp = regex.exec(line)[0];
    result = temp
      .replace("_", "")
      .replace("2", "")
      .replace("(", "")
      .replace(".default", "");
  }
  return result;
}

//iterates line by line for regex
export default class TraverseWebpack {
  grepWithFs(filename: string) {
    const regexp1 = "_reactDom.render";
    const regexp2 = /_createClass\([A-Z][A-Za-z]*/;
    const regexp3 = /var.[A-Z][A-Za-z]*.=.function.[A-Z][A-Za-z]*\(props\).{/;
    const regexp4 = /_react2.default.createElement\(_[A-Z][A-Za-z]*|_react2.default.createElement\([A-Z][A-Za-z]*/;
    let fp = new qfgets(filename);
    const contObj: any = {};
    const lineArr: any = [];
    let currentClass: string = "";
    function loop() {
      for (let i = 0; i < 40; i++) {
        let line = fp.fgets();
        if (line.match(regexp1)) {
          //finds root of React application in development
          currentClass = "";
        } else if (regexp2.exec(line)) {
          // Get Class from line if class is present
          let cleanClass = regWithMe(
            line,
            /(?!_createClass)+\([A-Z][A-Za-z]*/
          );
          if (!contObj[cleanClass]) { //saves found class in return object
            contObj[cleanClass] = { props: [], parent: null };
          }
          currentClass = cleanClass;
        } else if (regexp3.exec(line)) {
          //  Grabs presentational Components if present
          let presComp = regWithMe(line, /[A-Z][A-Za-z]*/);
          if (!contObj[presComp]) { //saves found components in return object
            contObj[presComp] = { props: [], parent: null };
          }
          currentClass = presComp; // prepare components to attach props if found next
        } else if (regexp4.exec(line)) {
          // Component creation with props and assigns to component
          let elementItem = regWithMe(
            line,
            /(?!_react2.default.createElement)\(_[A-Z][A-Za-z]*|(?!_react2.default.createElement)\([A-Z][A-Za-z]*/
          );
          let elementProps = regWithMe(line, /\{.+\}/);
          if (!elementProps) {
            elementProps = "null";
          }
          if (!contObj[elementItem]) { //if return object does not contain current component, adds to object
            contObj[elementItem] = { props: [], parent: null };
          }
          if (currentClass !== "") { //if current class has value, set parent/child relationship
            contObj[elementItem].parent = currentClass;
          }
          elementProps = elementProps 
            .replace("{", "")
            .replace("}", "")
            .replace(" ", "");
          let propArr = elementProps.split(/,|:/g);
					let propObj: any = {};
					//parse through line from bundle containing React element props
          for (let i = 0; i < propArr.length - 1; i += 2) {
            let propsReg = /props.[A-Za-z]*|state.[A-Za-z]*/;
            if (propsReg.exec(propArr[i + 1])) {
              let val = regWithMe(
                propArr[i + 1],
                /props.[A-Za-z]*|state.[A-Za-z]*/
              );
              propObj[propArr[i].trim()] = val;
            } else {
              propObj[propArr[i].trim()] = propArr[i + 1].trim();
            }
          }
          let propKeys = Object.keys(propObj);
          for (let i = 0; i < propKeys.length; i++) {
            if (
              !propObj[propKeys[i]].includes("props") &&
              !propObj[propKeys[i]].includes("state")
            ) {
              let lineArrInd = 0;
              while (
                !lineArr[lineArrInd].includes("props") &&
                !lineArr[lineArrInd].includes("state") &&
                lineArrInd < 3
              ) {
                lineArrInd++;
              }
              if (lineArrInd < 3) {
                let prop = regWithMe(
                  lineArr[lineArrInd],
                  /props.[A-Za-z]*|state.[A-Za-z]*/
                );
                propObj[propKeys[i]] = prop;
              }
            }
          }
          contObj[elementItem].props = propObj;
        }
        lineArr.unshift(line);
        if (lineArr.length > 4) {
          lineArr.pop();
        }
      }

      if (!fp.feof()) setImmediate(loop);
      /* Generate Component Tree file */
      fs.writeFile(
        __dirname + "/../../../server/src/componentTree.json",
        JSON.stringify(contObj),
        (err: any) => {
          if (err) console.log(err);
        }
      );
    }
    loop();
  }
}
