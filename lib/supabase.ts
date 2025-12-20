import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://haeifluvvazdealsofle.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhZWlmbHV2dmF6ZGVhbHNvZmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDM2OTcsImV4cCI6MjA4MTcxOTY5N30.p-Lren_jLUuA1BIP1TgRmv5gK4cJuIf-hkZIqo5I1pA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)