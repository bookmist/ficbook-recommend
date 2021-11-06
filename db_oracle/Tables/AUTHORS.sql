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
is '���� ������� ������';
comment on column AUTHORS.MODIFIED
is '���� ���������� ��������� ������';
-- Create/Recreate indexes

  CREATE UNIQUE INDEX PK_AUTHORS ON AUTHORS (IDAUTHOR) 
  ;

