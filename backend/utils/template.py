from num2words import num2words
from collections import Counter
from datetime import datetime, date

def summarize_photos(photos: list[dict]):
    summary = {}
    floorings = set()
    for photo in photos:
        if photo.get("flooring"):
            floorings.add(photo["flooring"])

        if not photo.get("category"):
            continue
        
        if photo.get("category") not in summary:
            summary[photo["category"]] = {
                "featuresFixtures": set(),
                "primeCostItems": set(),
                "floorings": set()
            }
        
        # Update sets directly using split and update
        if photo.get("featuresFixtures"):
            summary[photo["category"]]["featuresFixtures"].update(photo["featuresFixtures"])
        
        if photo.get("primeCostItems"):
            summary[photo["category"]]["primeCostItems"].update(photo["primeCostItems"])

        if photo.get("flooring"):
            summary[photo["category"]]["floorings"].add(photo["flooring"])

    categories = []
    for k, v in summary.items():
        categories.append({
            "category": k,
            "featuresFixtures": list(v["featuresFixtures"]),
            "primeCostItems": list(v["primeCostItems"]),
            "floorings": list(v["floorings"])
        })

    CATEGORY_ORDER = [
        'Bedroom', 'Bathroom', 'Ensuite', 'Ensuite 2',
        'Living', 'Living And Dining',
        'Dining', 'Formal Dining',
        'Kitchen', 'Kitchen 1', 'Kitchen 2', 'Kitchen And Dining', 'Kitchen And Meals',
        'Lounge',
        'Family', 'Family And Meals',
        'Alfresco', 'Porch', 'Balcony', 'Patio', 'Deck',
        'Laundry',
        'Study', 'Media Room', 'Theatre Room', 'Rumpus', 'Retreat',
        'Entertainment Area', 'Sunroom', 'Storage', 'Workshop',
        'Powder Room', 'Toilet', 'General', 'Backyard',
    ]

    def get_category_sort_key(category):
        import re
        lower = category.lower()
        if lower.startswith('bedroom '):
            match = re.search(r'bedroom (\d+)', lower)
            if match:
                return (0, 0, int(match.group(1)), category)
        if lower.startswith('ensuite'):
            match = re.search(r'ensuite\s*(\d*)', lower)
            num = int(match.group(1)) if match and match.group(1) else 0
            base_idx = CATEGORY_ORDER.index('Ensuite') if 'Ensuite' in CATEGORY_ORDER else 2
            return (1, base_idx, num, category)
        idx = CATEGORY_ORDER.index(category) if category in CATEGORY_ORDER else -1
        if idx != -1:
            return (1, idx, 0, category)
        return (2, 0, 0, category)

    categories.sort(key=lambda x: get_category_sort_key(x['category']))

    new_summary = {
        "categories": categories,
        "floorings": list(floorings)
    }

    return new_summary

def format_currency_words(amount: float):
    if not amount:
        return ""
    try:
        # Convert to integer to remove cents
        amount = int(float(amount))
        # Get the basic number words
        words = num2words(amount)
        words = words.replace(',', '')
        # Split into words
        word_list = words.split()
        # Capitalize each word except 'and'
        capitalized_words = [word.capitalize() if word != 'and' else word for word in word_list]
        # Join back together and add 'Dollars'
        return ' '.join(capitalized_words) + ' Dollars'
    except:
        return ""

def format_date(date_input):
    if not date_input:
        return ''
    if isinstance(date_input, (datetime, date)):
        return date_input.strftime('%d %B %Y')
    if isinstance(date_input, str):
        date_obj = datetime.strptime(date_input, '%Y-%m-%d')
        return date_obj.strftime('%d %B %Y')
    return ''

def format_date_v2(date_input):
    """
    Format date as '04 October 2025' (day with leading zero, full month name, full year)
    """
    if not date_input:
        return ''
    if isinstance(date_input, (datetime, date)):
        return date_input.strftime('%d %B %Y')
    if isinstance(date_input, str):
        date_obj = datetime.strptime(date_input, '%Y-%m-%d')
        return date_obj.strftime('%d %B %Y')
    return ''

def format_owners(owners: list[dict]):
    """
    Format a list of owners with firstName and lastName into a comma-separated string
    with '&' before the last owner.
    
    Example: [{'firstName': 'Test 1', 'lastName': 'Ting 1'}, {'firstName': 'Test 2', 'lastName': 'Ting 2'}, {'firstName': 'Test 3', 'lastName': 'Ting 3'}]
    Returns: "Test 1 Ting 1, Test 2 Ting 2 & Test 3 Ting 3"
    """
    if not owners or not isinstance(owners, list):
        return ''
    
    # Filter out owners with missing names and format them
    valid_owners = []
    for owner in owners:
        if isinstance(owner, dict) and owner.get('firstName') and owner.get('lastName'):
            full_name = f"{owner['firstName']} {owner['lastName']}"
            valid_owners.append(full_name)
    
    if not valid_owners:
        return ''
    
    if len(valid_owners) == 1:
        return valid_owners[0]
    elif len(valid_owners) == 2:
        return f"{valid_owners[0]} & {valid_owners[1]}"
    else:
        # Join all but the last with commas, then add the last with &
        return f"{', '.join(valid_owners[:-1])} & {valid_owners[-1]}"

def format_rental_frequency(rental_frequency: str) -> str:
    match rental_frequency:
        case "Per Week":
            return "P/W"
        case "Per Month":
            return "P/M"
        case "Per Annum":
            return "P/A"
        case _:
            return "N/A"