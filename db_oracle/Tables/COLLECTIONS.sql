-- Create table

  CREATE TABLE COLLECTIONS 
   (	IDCOLLECTION integer, 
	NAME text DEFAULT NULL, 
	IDAUTHOR integer DEFAULT NULL NOT NULL , 
	CNT integer DEFAULT NULL, 
	INSERTED timestamp DEFAULT systimestamp NOT NULL , 
	MODIFIED timestamp DEFAULT systimestamp NOT NULL , 
	 CONSTRAINT PK_COLLECTIONS PRIMARY KEY (IDCOLLECTION) , 
	 CONSTRAINT FK_COLLECTIONS_IDAUTHOR FOREIGN KEY (IDAUTHOR)
	  REFERENCES AUTHORS (IDAUTHOR) ON DELETE CASCADE 
   ) ;

-- Add comments to the columns
comment on column COLLECTIONS.INSERTED
is '???? ??????? ??????';
comment on column COLLECTIONS.MODIFIED
is '???? ?????????? ????????? ??????';
-- Create/Recreate indexes

  CREATE INDEX FK_COLLECTIONS_IDAUTHOR ON COLLECTIONS (IDAUTHOR) 
  ;


  CREATE UNIQUE INDEX PK_COLLECTIONS ON COLLECTIONS (IDCOLLECTION) 
  ;

