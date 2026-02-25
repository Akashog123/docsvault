/**
 * Organization Admin middleware
 * - Allows only org-level admins (role: 'admin')
 * - Super admins (role: 'super_admin') are NOT allowed - they manage platform, not orgs
 */
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Organization admin access required' });
  }
  next();
};

export default adminOnly;
