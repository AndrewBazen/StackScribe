# StackScribe Data Directory

This directory contains the SQLite database for StackScribe.

## Files

- `stackscribe.db` - Main SQLite database file (created automatically)
- `stackscribe.db.backup` - Backup file (created by db-manager.ps1)

## Database Schema

The database contains the following tables:
- `archives` - Top-level containers for organizing content
- `tomes` - Collections within archives
- `entries` - Individual markdown documents
- `user_settings` - Application settings
- `user_metadata` - User-specific metadata

## Management

Use the provided tools to manage the database:

### PowerShell Script
```powershell
.\db-manager.ps1 check     # Check database status
.\db-manager.ps1 reset     # Delete database (will be recreated)
.\db-manager.ps1 backup    # Create backup
.\db-manager.ps1 restore   # Restore from backup
.\db-manager.ps1 info      # Show detailed information
```

### DevTools (in app)
- Click "Show DB Location" to see the exact path
- Click "Show DB Info" to see database details
- Use reset buttons to manage data during development

## Important Notes

- The database file is excluded from Git (see .gitignore)
- The database persists between app sessions
- Schema is managed by Tauri migrations
- Located at: `./data/stackscribe.db` relative to project root
