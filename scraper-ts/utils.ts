function stringToRegExp(pattern: string, flags?: string): RegExp {
        return new RegExp(pattern.replace(/[\[\]\\{}()+*?.$^|]/g, function (match) { return '\\' + match; }), flags);
    };

function asyncForEach<T1, T2>(a: T1[], func: (item: T1, i?: number, arr?:T1[]) =>Promise<T2>): Promise<T2[]>
{
    return Promise.all(a.map((item, i, arr) => func(item, i, arr)));
}

export { asyncForEach, asyncForEach as asyncMap,stringToRegExp}