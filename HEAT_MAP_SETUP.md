# Heat Map Feature Setup Instructions

## Overview
The heat map feature has been implemented in `src/app/(tabs)/map.tsx`. It displays public posts with location data on an interactive map, similar to Snapchat's heat map.

## Installation Steps

### 1. Install Dependencies
Run the following command to install the required packages:
```bash
npm install
```

This will install:
- `react-native-maps` - For map rendering
- `expo-location` - For location services

### 2. Set Up Database Functions
Run the SQL in `database_functions.sql` in your Supabase SQL Editor. This will:
- Create the `locations` table if it doesn't exist
- Add the foreign key constraint from `posts.location_id` to `locations.location_id`
- Create an index on coordinates for performance
- Create the required functions:
  - `get_public_posts_with_locations` - Fetches public posts within map bounds
  - `get_local_posts` - Fetches posts within a radius of a location

**Note**: The `locations` table will be created automatically with the following structure:
- `location_id` (bigint, primary key, auto-increment)
- `latitude` (double precision, required)
- `longitude` (double precision, required)
- `name` (varchar, optional)
- `address` (varchar, optional)
- `city` (varchar, optional)
- `country` (varchar, optional)
- `created_at` (timestamp with time zone)

### 3. Configure Expo
The `app.json` has been updated with the `expo-location` plugin. After installing dependencies, you may need to rebuild your app:
```bash
npx expo prebuild
```

For iOS, you may need to add location permissions to `Info.plist` (handled automatically by Expo).

## Features Implemented

### Map Component (`src/app/(tabs)/map.tsx`)
- Interactive map with public posts displayed as markers
- Heat map visualization using color-coded markers based on post density
- Marker clustering - posts at the same location are grouped together
- Click on map or markers to view local posts feed
- Automatic location detection and centering
- Viewport-based loading (only loads posts visible in current map bounds)
- Debounced region changes to avoid excessive API calls
- Caching system to reduce redundant requests

### Local Posts Feed (`src/components/LocalPostsFeed.tsx`)
- Modal component that displays when user clicks on map
- Shows posts within 10km radius of clicked location
- Uses existing `PostFeedItem` component for consistent UI
- Pull-to-refresh functionality
- Error handling and retry mechanism

### Server Functions (`src/server/map.ts`)
- `getPublicPostsWithLocations()` - Fetches posts within map bounds
- `getLocalPosts()` - Fetches posts within a radius
- TypeScript interfaces for type safety

## Performance Optimizations

1. **Debouncing**: Map region changes are debounced by 500ms to avoid excessive API calls
2. **Caching**: Results are cached for 5 minutes with automatic cleanup (keeps last 10 entries)
3. **Viewport-based loading**: Only loads posts visible in current map bounds
4. **Marker clustering**: Groups nearby posts to reduce marker count and improve performance

## Usage

1. Open the Map tab in the app
2. The map will automatically request location permissions and center on your location
3. Public posts with locations will appear as colored markers
4. Click anywhere on the map or on a marker to view local posts in that area
5. The local posts feed will show posts within 10km of the clicked location

## Marker Colors (Heat Map Effect)

- **Red** (#ff0000): High density (10+ posts)
- **Orange** (#ff8800): Medium-high density (5-9 posts)
- **Yellow** (#ffaa00): Medium density (2-4 posts)
- **Blue** (#00aaff): Low density (1 post)

## Troubleshooting

### TypeScript Errors
If you see TypeScript errors about missing modules, make sure to run `npm install` first.

### Map Not Showing
- Ensure you have internet connection (maps require network access)
- Check that location permissions are granted
- For iOS simulator, you may need to set a custom location in the simulator menu

### No Posts Showing
- Verify that the database functions are created in Supabase
- Check that posts have `location_id` set and visibility is 'public'
- Ensure the `locations` table has valid latitude/longitude data

### Location Permission Issues
- On iOS: Check Info.plist for location permission strings
- On Android: Permissions are handled automatically by Expo
- You may need to rebuild the app after adding location permissions

## Next Steps

1. Run `npm install` to install dependencies
2. Execute the SQL functions in Supabase
3. Test the map feature with posts that have location data
4. Customize marker colors and clustering behavior as needed

