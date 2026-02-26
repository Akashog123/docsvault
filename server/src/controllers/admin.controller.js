import Organization from '../models/Organization.js';
import User from '../models/User.js';

/**
 * Get all organizations, paginated, including their admins and members
 * Route: GET /api/admin/organizations
 * Access: Super Admin only
 */
export const getAllOrganizations = async (req, res) => {
  try {
    // 1. Pagination parameters
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // 2. Fetch total count for pagination metadata
    const totalCount = await Organization.countDocuments();

    // 3. Fetch paginated organizations and populate the admin details
    const organizations = await Organization.find()
      .sort({ createdAt: -1 }) // Newest first
      .skip(offset)
      .limit(limit)
      .populate('adminId', 'name email role')
      .lean(); // Use lean() for better performance as we'll be modifying the objects

    // 4. Fetch members for each organization
    // We use Promise.all to fetch members for all organizations concurrently
    const organizationsWithMembers = await Promise.all(
      organizations.map(async (org) => {
        // Find all users belonging to this organization, excluding the admin
        const members = await User.find({
          orgId: org._id,
          _id: { $ne: org.adminId?._id } // Don't include the admin in the members list
        }).select('name email role createdAt').lean();

        return {
          id: org._id,
          name: org.name,
          slug: org.slug,
          createdAt: org.createdAt,
          admin: org.adminId || null,
          members: members
        };
      })
    );

    // 5. Return structured response
    res.json({
      organizations: organizationsWithMembers,
      pagination: {
        limit,
        offset,
        total: totalCount
      }
    });
  } catch (error) {
    console.error('Error in getAllOrganizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
};
