import os
import re
import sys

# Target the specific path during the filter-branch tree walk
env_example_path = "backend/.env.example"

if os.path.exists(env_example_path):
    with open(env_example_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Strip out sensitive identifiers
    content = re.sub(r'SUPABASE_KEY=.*', 'SUPABASE_KEY=your_supabase_key_here', content)
    content = re.sub(r'SUPABASE_SERVICE_KEY=.*', 'SUPABASE_SERVICE_KEY=your_supabase_service_key_here', content)
    content = re.sub(r'JWT_SECRET=.*', 'JWT_SECRET=your_jwt_secret_here', content)
    
    with open(env_example_path, "w", encoding="utf-8") as f:
        f.write(content)
