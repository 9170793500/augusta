# Cloudflare — login "Server not configured"

## Aap ab **Cloudflare Pages** use kar rahe ho (`residency-app-uat`)

Screenshot mein **Builds → Functions** hai — yahan **variables add karne ka alag option nahi hota**. Variables **dusri jagah** add hoti hain.

---

## Variables kahan add karein (step-by-step)

1. **Workers & Pages** → apna project **`residency-app-uat`** kholo  
2. Upar tabs: **Deployments** ke bagal mein **Settings** (Builds tab par mat raho)  
3. **Settings** page par scroll / right sidebar: **Variables and Secrets**  
4. **+ Add** → **Environment variable** (ya **Secret**)  
5. Name: `VITE_SUPABASE_URL` → Value: local `.env` jaisa URL  
6. **Environment**: **Production** aur **Preview** **dono** tick karo (Uat branch = Preview)  
7. Dubara **+ Add** → `VITE_SUPABASE_ANON_KEY` → same environments  

**Total 2 variables**, har ek **Production + Preview** dono par.

> Agar sirf Production select kiya aur deploy `Uat` branch se ho raha hai, login fail ho sakta hai — **Preview bhi zaroori hai**.

### "Load failed" / variables dikhai nahi deti

- Browser refresh, incognito try karo  
- **Settings → Variables and Secrets** direct open karo (Builds → Functions mat use karo)  
- Page par **"Load failed"** ho to Cloudflare support / dobara login  

---

## Builds tab (jo screenshot mein hai)

| Field | Value |
|--------|--------|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Functions directory | `functions` |

Repo mein ab `functions/` folder hai — Pages deploy par `/api/supabase-config` yahan se chalega.

**Pages par Deploy command `wrangler deploy` ki zaroorat nahi** (sirf Worker project `augusta` ke liye).

---

## Deploy ke baad test

Browser mein — **JSON** aana chahiye, homepage HTML **nahi**:

- `https://agaoa.com/api/health` → `{"pagesFunctions":true,"supabaseConfigured":true}`
- `https://agaoa.com/api/supabase-config` → `url` + `anonKey`

Agar phir bhi poori website HTML dikhe → **naya deploy** trigger karo (Deployments → Retry / push on `Uat`).

---

## Kyun bar-bar toot ta hai

1. Variables sirf **Production** par, lekin branch **Uat** (Preview) se build  
2. Naya deploy **bina** `functions/` folder ke (purana commit)  
3. Build time par vars na hone se `supabase-config.json` empty — **Pages Functions** vars se fix ho jata hai jab upar wale 2 vars set hon  

---

## Optional: Worker project `augusta` (wrangler)

Agar domain **Worker** `augusta` se jaata ho: `npx wrangler deploy` + Worker **Settings → Variables (Production)**.  
Details: repo `wrangler.toml` comments.

## Optional: GitHub Secrets

`.github/workflows/deploy-uat.yml` — vars GitHub par rakho.