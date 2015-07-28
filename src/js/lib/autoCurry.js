module.exports = function () {
    Function.prototype.autoCurry = function (n) {
        return autoCurry(this, n);
    };
    Function.prototype.ac = Function.prototype.autoCurry;
    window.toArray = toArray;

    function toArray (arrayLike) {
        return Array.prototype.slice.call(arrayLike);
    }
    function curry (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        function f () {
            return fn.apply(this, args.concat(toArray(arguments)));
        }
        return f;
    }
    function autoCurry (fn, numArgs) {
        numArgs = numArgs || fn.length;
        function f () {
            if (arguments.length < numArgs) {
                return numArgs - arguments.length > 0 ?
                    autoCurry(curry.apply(this, [fn].concat(toArray(arguments))),
                              numArgs - arguments.length) :
                    curry.apply(this, [fn].concat(toArray(arguments)));
            } else {
                return fn.apply(this, arguments);
            }
        }
        f.toString = function () {
            return fn.toString();
        };
        f.curried = true;
        return f;
    }
};
