"""Username and UK phone helpers for registration."""

from __future__ import annotations

import re

USERNAME_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]{2,31}$")

RESERVED_USERNAMES = frozenset(
    {
        "admin",
        "administrator",
        "api",
        "auth",
        "bothies",
        "checklists",
        "explore",
        "fieldatlas",
        "field-atlas",
        "help",
        "hikes",
        "login",
        "logout",
        "map",
        "me",
        "mod",
        "moderator",
        "null",
        "official",
        "owner",
        "pitching",
        "profile",
        "register",
        "root",
        "settings",
        "staff",
        "support",
        "system",
        "undefined",
        "user",
        "username",
        "walker",
        "weather",
        "www",
    }
)

# Compact blocklist — matched against username with separators stripped.
BLOCKED_USERNAME_TERMS = frozenset(
    {
        "anal",
        "anus",
        "arse",
        "asshole",
        "bastard",
        "bitch",
        "bollock",
        "boner",
        "boob",
        "chink",
        "clit",
        "cock",
        "coon",
        "crap",
        "cunt",
        "dick",
        "dildo",
        "dyke",
        "fag",
        "faggot",
        "feck",
        "felch",
        "fellate",
        "fuck",
        "fudgepacker",
        "gaysex",
        "goddamn",
        "homo",
        "horny",
        "jizz",
        "kike",
        "labia",
        "muff",
        "nazi",
        "nigga",
        "nigger",
        "nonce",
        "nude",
        "orgasm",
        "penis",
        "piss",
        "porn",
        "prick",
        "pube",
        "pussy",
        "queer",
        "rape",
        "rapist",
        "retard",
        "scrotum",
        "sex",
        "shit",
        "slut",
        "smegma",
        "spastic",
        "spunk",
        "tit",
        "tosser",
        "turd",
        "twat",
        "vagina",
        "wank",
        "whore",
    }
)


def normalize_username(value: str) -> str:
    return value.strip().lower()


def username_format_ok(username: str) -> bool:
    return bool(USERNAME_PATTERN.fullmatch(username))


def username_is_blocked(username: str) -> str | None:
    handle = normalize_username(username)
    if not username_format_ok(handle):
        return "Username must be 3–32 characters: letters, numbers, _ or -"
    if handle in RESERVED_USERNAMES:
        return "That username is reserved"
    compact = re.sub(r"[_-]+", "", handle)
    for term in BLOCKED_USERNAME_TERMS:
        if len(term) <= 3:
            if compact == term:
                return "That username is not allowed"
        elif term in compact:
            return "That username is not allowed"
    return None


def normalize_uk_phone(value: str) -> str:
    raw = value.strip()
    if len(raw) > 16:
        raise ValueError("UK phone numbers can’t be longer than 16 characters")

    cleaned = re.sub(r"[\s().-]", "", raw)
    if cleaned.startswith("00"):
        cleaned = f"+{cleaned[2:]}"

    if cleaned.startswith("+44"):
        national = cleaned[3:]
    elif cleaned.startswith("44") and len(cleaned) >= 12:
        national = cleaned[2:]
    elif cleaned.startswith("0"):
        national = cleaned[1:]
    else:
        raise ValueError("Use a UK number, e.g. 07123 456789 or +44 7123 456789")

    if not re.fullmatch(r"\d{10}", national):
        raise ValueError("Enter a valid 11-digit UK number (including the leading 0)")

    # 7 = mobile; 1/2 = geographic; 3 = non-geographic; 5/8/9 = special services
    if national[0] not in "1235789":
        raise ValueError("Enter a valid UK mobile or landline number")

    return f"+44{national}"
