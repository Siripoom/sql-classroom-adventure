export function isTeacher(user:{app_metadata?:Record<string,unknown>} | null):boolean {
  return user?.app_metadata?.role==='teacher';
}
