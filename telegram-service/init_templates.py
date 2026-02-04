import sqlite3

conn = sqlite3.connect('data/database.db')

# Create templates table
conn.execute('''
CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT NOT NULL
)
''')

# Add sample templates
sample_templates = [
    ("Welcome Message", "Hello! Welcome to our group."),
    ("Promotion", "🎉 Special offer! Check out our latest deals!"),
    ("Announcement", "📢 Important announcement: We have exciting news to share!"),
]

for name, content in sample_templates:
    # Check if template already exists
    existing = conn.execute("SELECT id FROM templates WHERE name = ?", (name,)).fetchone()
    if not existing:
        conn.execute("INSERT INTO templates (name, content) VALUES (?, ?)", (name, content))

conn.commit()
conn.close()

print("✅ Templates table created and sample templates added!")
