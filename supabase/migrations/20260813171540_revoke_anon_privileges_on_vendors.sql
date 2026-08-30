/*
# Revoke signed-out privileges on the vendors table

1. Problem
   The previous revoke pass missed `vendors`, which still granted the signed-out
   `anon` role SELECT/INSERT/UPDATE/DELETE while all four of its row level
   security policies are scoped to signed-in wedding owners.

2. Change
   Revokes all `anon` privileges on `public.vendors`.

3. Security
   Defence in depth only; row level security already denied these requests.
*/

REVOKE ALL ON TABLE public.vendors FROM anon;
