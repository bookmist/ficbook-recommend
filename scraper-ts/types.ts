export 
    class CollectionItem {
        name: string;
        url: string;
        id: number;
        cnt: number;
        authorName: string;
        authorUrl: string;
        authorId: number;
        cntDb: number;
        pages: number;
    }
export 
    class BookItem {
        name: string;
        url: string;
        id: number;
        authorName: string;
        authorUrl: string;
        authorId: number;
        card: string;
        rating:string;
        pages:number;
        chapters:number;
    }

export
    class CommentItem {
    commentId: number;
    commentDate: Date;
    authorUrl: string;
    authorId: number;
    authorAvatar: string;
    authorName: string;
    chapterLink: string;
    text: string;
    thumbUpCount: string;
    bookId: number;
    chapterId:number;
    requestId: number;
    bookName: string;
}

export
class LogItem {
    rootBookId:number;
    url:string;
    startTime:Date;
    downloadTime:number;
    parseTime:number;
    updateTime:number;
}