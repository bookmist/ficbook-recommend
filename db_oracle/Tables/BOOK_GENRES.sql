-- Create table

  CREATE TABLE BOOK_GENRES 
   (	BOOK_ID integer(*,0), 
	GENRE_ID integer(*,0), 
	INSERTED timestamp DEFAULT systimestamp, 
	MODIFIED timestamp DEFAULT systimestamp, 
	 CONSTRAINT PK_BOOK_GENRES PRIMARY KEY (BOOK_ID, GENRE_ID) , 
	 CONSTRAINT FK_BOOK_GENRES_GENRE_ID FOREIGN KEY (GENRE_ID)
	  REFERENCES GENRES (GENRE_ID) , 
	 CONSTRAINT FK_BOOK_GENRES_BOOK_ID FOREIGN KEY (BOOK_ID)
	  REFERENCES BOOKS (IDBOOK) 
   ) ;

-- Add comments to the columns
comment on column BOOK_GENRES.INSERTED
is 'Дата вставки записи';
comment on column BOOK_GENRES.MODIFIED
is 'Дата последнего изменения записи';
-- Create/Recreate indexes

  CREATE INDEX FK_BOOK_GENRES_GENRE_ID ON BOOK_GENRES (GENRE_ID) 
  ;


  CREATE UNIQUE INDEX PK_BOOK_GENRES ON BOOK_GENRES (BOOK_ID, GENRE_ID) 
  ;

