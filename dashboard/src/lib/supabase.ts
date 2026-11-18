import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://jjvalqnpqtokorliyjaz.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqdmFscW5wcXRva29ybGl5amF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMTQ2MjIsImV4cCI6MjExMDU5MDYyMn0.5EsxIgz86_ouH_mcbHlD8nqfKSbSBwhxX-G5k9brV_Y'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

