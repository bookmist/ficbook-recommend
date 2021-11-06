-- Create table

  CREATE TABLE LOG 
   (	ROOT_BOOK_ID integer(*,0), 
	URL text, 
	START_TIME TIMESTAMP (6), 
	DOWNLOAD_TIME integer(*,0), 
	PARSE_TIME integer(*,0), 
	UPtimestamp_TIME integer(*,0)
   ) ;

-- Add comments to the table
comment on table LOG
is '��� ������� ��������';
-- Add comments to the columns
comment on column LOG.ROOT_BOOK_ID
is '��� ������ (�� �����)';
comment on column LOG.URL
is '��� ��������';
comment on column LOG.START_TIME
is '����� ������';
comment on column LOG.DOWNLOAD_TIME
is '����� ������� (�����) � �������������';
comment on column LOG.PARSE_TIME
is '����� �������';
comment on column LOG.UPtimestamp_TIME
is '����� ������� � ��';
-- Create/Recreate indexes

  CREATE INDEX I1 ON LOG (START_TIME) 
  ;

