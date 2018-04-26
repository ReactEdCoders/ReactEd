//var extendMe = '|A*5'             //returns --> { state: [ null, null, null ] }
//var extendMe = '|Agoldenretriever,poodle,chihuahua,maltese,shiba,pomeranian^' //returns --> { state: [ 'hour', 'day', 'week' ] }
//var extendMe = '|O^'              //returns --> { state: { testKey: null } }
//var extendMe = '|O*8'             //returns --> { state: [ {}, {}, {} ] }
//var extendMe = '|O*3hour,day,week^' //returns --> { state: [ { hour: null }, { day: null }, { week: null }, { year: null } ] }
var extendMe = '|O*3Sname,Nphone,BisCool,BhasCar,BisScrub,ZisDatable^' 
//returns --> result { state: [ { name: 'string' }, { phone: 'number' }, { isCool: 'boolean' }, { hasCar: 'boolean' }, { isScrub: 'boolean' }, { isDatable: null } ] }

//pipe tells editor to listen for array or object to be created, declared immediately after by 'A' and 'O' respectively
//caret indicates end of current sequence, and to listen for next sequence that may be on same level or can be nested deeper
//'*' tells editor how many arrays or objects to create
//strings following arrays that are separated by commas will be pushed in; if no values provided can will array with null as in first example
//datatype indicators S = string, N = Number, B = boolean, Z = null;
//strings following objects or number creating x objects will listen for datatype, which will be set as value. Keyname immediately follows
//editor listens for current sequence with no spaces


//todos below:
//var extendMe = '|A*5>|O*5' --> nest further

//counts up to 4 chars starting from beginning of sequence
function InputStream(input) {
    var pos = 0
    return {
        next: next,
        peek: peek,
        skipTwo: skipTwo,
        three: three,
        eof: eof
    };
    function peek() {
        let ch = input.charAt(pos)
        return ch;
    }
    function next() {
        var ch = input.charAt(pos+1);
        return ch
    }
    function skipTwo() {
        var ch = input.charAt(pos+2);
        return ch
    }
    function three() {
        var ch = input.charAt(pos+3);
        return ch
    }
    function eof() {
        return 'start new word';
    }
}
//stream indicates which part of the sequence comes next and gives direction to code to organize data
//for var extendMe = '|A*5', input.peek() === |, input.next() === A and so on 
var stream = InputStream(extendMe)

//random words that are used to fill array as placeholders
let words = ['exercitationem', 'perferendis', 'perspiciatis', 'laborum', 'eveniet',
				'sunt', 'iure', 'nam', 'nobis', 'eum', 'officiis', 'excepturi',
				'odio', 'consectetur', 'quasi', 'aut', 'quisquam', 'vel', 'eligendi',
				'itaque', 'non', 'odit', 'tempore', 'quaerat', 'dignissimos',
				'facilis', 'neque', 'nihil', 'expedita', 'vitae', 'vero', 'ipsum',
				'nisi', 'animi', 'cumque', 'pariatur', 'velit', 'modi', 'natus',
				'iusto', 'eaque', 'sequi', 'illo', 'sed', 'ex', 'et', 'voluptatibus',
				'tempora', 'veritatis', 'ratione', 'assumenda', 'incidunt', 'nostrum',
				'placeat', 'aliquid', 'fuga', 'provident', 'praesentium', 'rem',
				'necessitatibus', 'suscipit', 'adipisci', 'quidem', 'possimus',
				'voluptas', 'debitis', 'sint', 'accusantium', 'unde', 'sapiente',
				'voluptate', 'qui', 'aspernatur', 'laudantium', 'soluta', 'amet',
				'quo']
const wordsLength = words.length

//takes stream and iterates, passing to new functions as needed
function tokenStream(input) {
    let result = {state: null}
    let current = null
    let ch = input.peek()
    if(input.peek() === " ") {
        ch = input.next()
    }
    read_next()

    //only allow caret to break --> too many other vars
    function getString() {
        let sliceExtendMe = extendMe.indexOf(input.skipTwo())
        let slicedEM = extendMe.slice(sliceExtendMe, extendMe.indexOf('^'))       
        let strStart = extendMe.indexOf(input.skipTwo())
        let comma = extendMe.indexOf(',')
        let arr = slicedEM.split(',')
        for(let i = 0; i < arr.length; i++) {
            if(Array.isArray(result.state) === true) {
                result.state.push(arr[i])
            }
        }
        return
    }

    //if current char is pipe look at next to possibly create nested array or object
    function isPipe() {
        let strTrue = /^[a-z]+$/i.test(input.skipTwo())
        let strStart = extendMe.indexOf(input.skipTwo())
        if (input.next() === "A") {
            result.state = [] 
            if (input.skipTwo() === '*' && (typeof Number.parseInt(input.three()) === 'number')) {                
                result.state.length = Number.parseInt(input.three())         
                result.state.fill(null)
                //populates with random words from array --> values from any array can be passed in to array if none provided
                for(let i = 0; i < result.state.length; i++) {
                    let random = (Math.floor(Math.random() * wordsLength))
                     if(result.state[i] === null) result.state[i] = words[random]
                 }
                return result;
            } 
            if (strTrue === true) {
                return getString()
            }   
            return
        }
        if (input.next() === "O") {
            var caret = extendMe.indexOf('^')
            if(caret === -1) {
                result.state.length = Number.parseInt(input.three())         
                result.state.fill(null)
                return result
            }
            var keyArr = extendMe.slice(4, caret).split(',')
            if(input.skipTwo() === '^') result.state = {testKey: null}
            if(input.skipTwo() === '*' && (typeof Number.parseInt(input.three()) === 'number')) { 
                result.state = []                
                for(let i = 0; i < keyArr.length; i++) {
                    let newObj = {}                       
                    'Sname,Nphone,BisCool,BhasCar,Scity^'
                    if (keyArr[i][0] === 'S') {
                        newObj[keyArr[i].slice(1)] = 'string'
                    }
                    if(keyArr[i][0] === 'N') {
                        newObj[keyArr[i].slice(1)] = 'number'
                    } 
                    if(keyArr[i][0] === 'B') {
                        newObj[keyArr[i].slice(1)] = 'boolean'
                    }
                    if(keyArr[i][0] === 'Z') {
                        newObj[keyArr[i].slice(1)] = null
                    }
                    result.state.push(newObj); 
                } 
            }
        }
    }

    function read_next() {
        if(current === 'next') {
            let ch = input.next()
        }
        if(current === 'skip') {
            console.log('is skip!!!')
            let ch = input.skipTwo()
        }
        if (ch === " ") {
            return read_next();
        }
        if (ch === "|") {
            return isPipe()
        }
        if (ch === '>') console.log('greater than')
        return read_next()
    }
    console.log(result)
}
tokenStream(stream)