-- Drop all tables created by the test-dock plugin.
-- This file is run automatically when the plugin is deleted via DELETE /api/admin/plugins/test-dock.
DROP TABLE IF EXISTS plugin_test_dock_dummy CASCADE;
