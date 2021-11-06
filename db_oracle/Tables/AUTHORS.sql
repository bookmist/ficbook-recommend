-- Create table

  CREATE TABLE AUTHORS 
   (	IDAUTHOR integer, 
	NAME text DEFAULT NULL NOT NULL , 
	AVATAR text, 
	INSERTED timestamp DEFAULT systimestamp NOT NULL , 
	MODIFIED timestamp DEFAULT systimestamp NOT NULL , 
	 CONSTRAINT PK_AUTHORS PRIMARY KEY (IDAUTHOR) 
   ) ;

-- Add comments to the columns
comment on column AUTHORS.INSERTED
is 'Дата вставки записи';
comment on column AUTHORS.MODIFIED
is 'Дата последнего изменения записи';
-- Create/Recreate indexes

  CREATE UNIQUE INDEX PK_AUTHORS ON AUTHORS (IDAUTHOR) 
  ;

