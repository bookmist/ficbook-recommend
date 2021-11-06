-- Create table

  CREATE TABLE COMMENTS 
   (	COMMENT_ID integer NOT NULL , 
	COMMENT_timestamp timestamp, 
	AUTHOR_ID integer, 
	CHAPTER_LINK text, 
	TEXT CLOB, 
	THUMBUP_COUNT text, 
	BOOK_ID integer, 
	REQUEST_ID integer(*,0), 
	INSERTED timestamp DEFAULT systimestamp, 
	MODIFIED timestamp DEFAULT systimestamp, 
	 CONSTRAINT PK_COMMENTS1 PRIMARY KEY (COMMENT_ID) , 
	 CONSTRAINT F1 FOREIGN KEY (AUTHOR_ID)
	  REFERENCES AUTHORS (IDAUTHOR) 
   ) ;

-- Add comments to the columns
comment on column COMMENTS.INSERTED
is 'Дата вставки записи';
comment on column COMMENTS.MODIFIED
is 'Дата последнего изменения записи';
-- Create/Recreate indexes

  CREATE UNIQUE INDEX PK_COMMENTS1 ON COMMENTS (COMMENT_ID) 
  ;

