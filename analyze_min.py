def above_action_line(m, a):
    # Simple FBM line used in your app: success zone if m >= 12 - a
    return m >= (12 - a)

path = input("Enter path to CSV export: ").strip()

# Read whole file as text, then split into lines
try:
    text = open(path, "r", encoding="utf-8").read()
except:
    print("Cannot open file. Check the path.")
    raise SystemExit

lines = text.strip().split("\n")
def new_func(lines):
    if len(lines) <= 1:
        print("No data rows found.")
        raise SystemExit

new_func(lines)

# Header and column indices
header = lines[0].strip().split(",")
def find(colname):
    try:
        return header.index(colname)
    except:
        return -1

i_m = find("motivation")
i_a = find("ability")
i_d = find("did")

if i_m == -1 or i_a == -1 or i_d == -1:
    print("CSV must include columns: motivation, ability, did")
    raise SystemExit

# Tallies
n = 0
succ = 0
sum_m = 0
sum_a = 0
above = 0

# Go through each data row
for raw in lines[1:]:
    row = raw.strip()
    if row == "":
        continue
    cols = row.split(",")
    # Guard against short rows
    if len(cols) <= max(i_m, i_a, i_d):
        continue

    # Parse numbers safely
    try:
        m = int(cols[i_m])
    except:
        m = 0
    try:
        a = int(cols[i_a])
    except:
        a = 0

    d = cols[i_d].strip().lower()

    n = n + 1
    sum_m = sum_m + m
    sum_a = sum_a + a
    if d == "yes":
        succ = succ + 1
    if above_action_line(m, a):
        above = above + 1

# Compute simple stats
if n == 0:
    print("No valid rows.")
    raise SystemExit

avg_m = sum_m / n
avg_a = sum_a / n
succ_rate = (succ / n) * 100.0
above_rate = (above / n) * 100.0

# Report
print("==== FBM Minimal Summary ====")
print("Entries:", n)
print("Success rate (did=yes):", round(succ_rate, 1), "%")
print("Average Motivation (0-10):", round(avg_m, 2))
print("Average Ability (0-10):", round(avg_a, 2))
print("Points above action line (m >= 12 - a):", round(above_rate, 1), "%")
