CREATE OR REPLACE FUNCTION get_surah_list()
RETURNS TABLE (
    surah_number integer,
    surah_name text,
    surah_name_arabic text,
    ayah_count bigint
)
LANGUAGE sql
STABLE
AS $$
    SELECT surah_number, surah_name, surah_name_arabic, COUNT(*) AS ayah_count
    FROM verses
    GROUP BY surah_number, surah_name, surah_name_arabic
    ORDER BY surah_number;
$$;
