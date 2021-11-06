-- Create table

  CREATE TABLE GENRES 
   (	GENRE_ID integer(*,0), 
	TYPE integer(*,0) DEFAULT 0, 
	CAPTION text, 
	INSERTED timestamp DEFAULT systimestamp CONSTRAINT CKC_GENRES_INSERTED NOT NULL , 
	MODIFIED timestamp DEFAULT systimestamp CONSTRAINT CKC_GENRES_MODIFIED NOT NULL , 
	 CONSTRAINT PK_GENRES PRIMARY KEY (GENRE_ID) 
   ) ;

-- Add comments to the columns
comment on column GENRES.INSERTED
is 'Дата вставки записи';
comment on column GENRES.MODIFIED
is 'Дата последнего изменения записи';
-- Create/Recreate indexes

  CREATE UNIQUE INDEX PK_GENRES ON GENRES (GENRE_ID) 
  ;

