import re, unicodedata

def _remove_vn_accents(text):
    if not text:
        return ""
    text = unicodedata.normalize('NFD', str(text))
    text = re.sub(r'[\u0300-\u036f]', '', text)
    text = text.replace('đ', 'd').replace('Đ', 'D')
    return text.lower().strip()

def normalize_linkedin_url(url):
    if not url:
        return ""
    url = url.strip().split("?")[0]
    if url.endswith("/"):
        url = url[:-1]
    url = re.sub(r'^https?://[a-z]{2,3}\.linkedin\.com', 'https://www.linkedin.com', url)
    url = re.sub(r'^https?://linkedin\.com', 'https://www.linkedin.com', url)
    return url

def _extract_lk_username(url):
    if url and "/in/" in url:
        u = url.split("/in/")[-1].split("/")[0].split("?")[0].strip().lower()
        if u: return u
    return None

def _normalize_lead_item(lead):
    lead.pop("_id", None)
    email = (lead.get("email") or "").strip()
    if email.lower() == "chưa có": email = ""
    lead["email"] = email
    lead["email_lower"] = email.lower()

    url = (lead.get("linkedin_url") or "").strip()
    if url:
        url = normalize_linkedin_url(url)
        lead["linkedin_url"] = url
    else:
        lead["linkedin_url"] = ""
    lead["lk_username"] = _extract_lk_username(lead.get("linkedin_url")) or ""

    name = (lead.get("name") or "").strip()
    if name.lower() == "chưa có": name = ""
    lead["name"] = name

    company = (lead.get("company") or "").strip()
    if company.lower() == "chưa có": company = ""
    lead["company"] = company

    if name and company:
        name_clean = _remove_vn_accents(name)
        comp_clean = _remove_vn_accents(company)
        lead["name_comp_key"] = f"{name_clean}||{comp_clean}"
    else:
        lead["name_comp_key"] = ""
    return lead

def _is_matching_lead(l1, l2):
    e1 = l1.get("email_lower") or (l1.get("email") or "").strip().lower()
    e2 = l2.get("email_lower") or (l2.get("email") or "").strip().lower()
    if e1 and e2 and e1 == e2: return True

    u1 = l1.get("lk_username") or _extract_lk_username(l1.get("linkedin_url"))
    u2 = l2.get("lk_username") or _extract_lk_username(l2.get("linkedin_url"))
    if u1 and u2 and u1 == u2: return True

    k1 = l1.get("name_comp_key") or f"{_remove_vn_accents(l1.get('name'))}||{_remove_vn_accents(l1.get('company'))}"
    k2 = l2.get("name_comp_key") or f"{_remove_vn_accents(l2.get('name'))}||{_remove_vn_accents(l2.get('company'))}"
    if k1 and k2 and k1.strip("||") and k2.strip("||") and k1 == k2: return True

    n1 = _remove_vn_accents(l1.get("name"))
    n2 = _remove_vn_accents(l2.get("name"))
    c1 = _remove_vn_accents(l1.get("company"))
    c2 = _remove_vn_accents(l2.get("company"))
    if n1 and n2 and c1 and c2 and n1 == n2 and c1 == c2: return True

    return False
