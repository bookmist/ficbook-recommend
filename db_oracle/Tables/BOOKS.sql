-- Create table

  CREATE TABLE BOOKS 
   (	IDBOOK integer NOT NULL , 
	NAME text, 
	IDAUTHOR integer, 
	PLUS integer, 
	CARD CLOB, 
	RATING text, 
	INSERTED timestamp DEFAULT systimestamp, 
	MODIFIED timestamp DEFAULT systimestamp, 
	PAGES integer(*,0), 
	CHAPTERS integer(*,0), 
	LAST_COL_LIST_LOAD timestamp, 
	 CONSTRAINT PK_BOOKS1 PRIMARY KEY (IDBOOK) , 
	 CONSTRAINT CKC_BOOKS_IDBOOK1 CHECK (IDBOOK IS NOT NULL) , 
	 CONSTRAINT FK_BOOKS_IDAUTHOR1 FOREIGN KEY (IDAUTHOR)
	  REFERENCES AUTHORS (IDAUTHOR) ON DELETE CASCADE 
   ) ;

-- Add comments to the columns
comment on column BOOKS.INSERTED
is 'Дата вставки записи';
comment on column BOOKS.MODIFIED
is 'Дата последнего изменения записи';
comment on column BOOKS.LAST_COL_LIST_LOAD
is 'Дата последней загрузки списка коллекций, в которые входит книга';
-- Create/Recreate indexes

  CREATE UNIQUE INDEX PK_BOOKS1 ON BOOKS (IDBOOK) 
  ;

