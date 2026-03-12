"use server";

import dbConnect from "@/lib/mongodb";
import ProjectRule from "@/models/ProjectRule";
import ProjectIdea from "@/models/ProjectIdea";
import Team from "@/models/Team";
import Section from "@/models/Section";
import Course from "@/models/Course";
import StudentAdmin from "@/models/StudentAdmin";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------
// Project Rules Actions (Admin)
// ---------------------------------------------------------------------

export async function getProjectRule(courseId: string) {
    await dbConnect();
    const rule = await ProjectRule.findOne({ courseId }).lean();
    return rule ? JSON.parse(JSON.stringify(rule)) : null;
}

export async function saveProjectRule(courseId: string, maxTeamSize: number, allowDuplicateIdeas: boolean) {
    await dbConnect();
    await ProjectRule.findOneAndUpdate(
        { courseId },
        { courseId, maxTeamSize, allowDuplicateIdeas },
        { upsert: true, new: true }
    );
    revalidatePath(`/admin/courses/${courseId}/projects`);
    return { success: true };
}

// ---------------------------------------------------------------------
// Project Ideas Actions (Admin & Student)
// ---------------------------------------------------------------------

export async function getProjectIdeas(courseId: string) {
    await dbConnect();
    const ideas = await ProjectIdea.find({ courseId }).sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(ideas));
}

export async function addProjectIdea(courseId: string, title: string, description: string, source: "admin_manual" | "student_custom", createdBy: string) {
    await dbConnect();
    const newIdea = await ProjectIdea.create({
        courseId,
        title,
        description,
        source,
        createdBy,
        isApproved: source === "admin_manual" ? true : false // student custom ideas might need approval
    });
    revalidatePath(`/admin/courses/${courseId}/projects`);
    revalidatePath(`/projects/${courseId}`);
    return { success: true, idea: JSON.parse(JSON.stringify(newIdea)) };
}

export async function deleteProjectIdea(ideaId: string, courseId: string) {
    await dbConnect();
    await ProjectIdea.findByIdAndDelete(ideaId);
    
    // Also remove reference from any team that had selected it
    await Team.updateMany({ ideaId }, { $unset: { ideaId: "" } });
    
    revalidatePath(`/admin/courses/${courseId}/projects`);
    revalidatePath(`/projects/${courseId}`);
    return { success: true };
}

// parsePdfIdeas has been moved to @/actions/pdf-parser.ts to isolate the pdf2json dependency

// ---------------------------------------------------------------------
// Teams Actions (Student & Admin)
// ---------------------------------------------------------------------

export async function searchStudentsForTeam(courseId: string, query: string) {
    await dbConnect();
    
    // Safety check: ensure query is long enough
    if (!query || query.length < 2) return [];

    // Find all sections for this course
    const sections = await Section.find({ courseId }).lean();
    
    const matchedStudents: any[] = [];
    
    sections.forEach(section => {
        section.students.forEach((student: any) => {
            if (
                student.studentId.includes(query) || 
                student.name.toLowerCase().includes(query.toLowerCase())
            ) {
                // Check if they are already in a team for this course
                matchedStudents.push({
                    ...student,
                    sectionNumber: section.sectionNumber
                });
            }
        });
    });

    // Determine team status for matches
    for (let student of matchedStudents) {
        const teamMatch = await Team.findOne({ courseId, members: student.studentId }).lean();
        student.hasTeam = !!teamMatch;
    }

    return JSON.parse(JSON.stringify(matchedStudents));
}

export async function createTeam(
    courseId: string, 
    leaderId: string, 
    memberIds: string[], 
    ideaOption: { type: "idea_id", value: string } | { type: "custom", title: string, description: string },
    sectionNumber: string,
    day: string,
    period: string
) {
    await dbConnect();

    // 1. Get Project Rules
    const rules = await ProjectRule.findOne({ courseId }).lean();
    if (!rules) throw new Error("Project rules not defined for this course.");

    // 2. Validate max team size
    const allMembers = [leaderId, ...memberIds];
    const uniqueMembers = [...new Set(allMembers)]; // remove duplicates
    
    if (uniqueMembers.length > rules.maxTeamSize) {
        throw new Error(`Team size exceeds the maximum limit of ${rules.maxTeamSize}`);
    }

    // 3. Validate no member is already in a team
    const existingTeamCheck = await Team.findOne({ 
        courseId, 
        members: { $in: uniqueMembers } 
    }).lean();
    
    if (existingTeamCheck) {
        throw new Error("One or more students are already in a team for this course.");
    }

    // 4. Validate Idea selection (duplicate check)
    let finalIdeaId: string | undefined = undefined;
    let finalCustomIdea: { title: string; description: string } | undefined = undefined;

    if (ideaOption.type === "idea_id") {
        if (!rules.allowDuplicateIdeas) {
            const ideaInUse = await Team.findOne({ courseId, ideaId: ideaOption.value }).lean();
            if (ideaInUse) {
                throw new Error("This idea has already been selected by another team.");
            }
        }
        finalIdeaId = ideaOption.value;
    } else {
        finalCustomIdea = {
            title: ideaOption.title,
            description: ideaOption.description
        };
    }

    // 5. Create Team
    const newTeam = await Team.create({
        courseId,
        ideaId: finalIdeaId,
        leaderId,
        members: uniqueMembers,
        sectionNumber,
        day,
        period,
        customIdea: finalCustomIdea
    });

    revalidatePath(`/projects/${courseId}`);
    revalidatePath(`/projects/board`);
    
    return { success: true, team: JSON.parse(JSON.stringify(newTeam)) };
}

export async function getTeamsForCourse(courseId?: string) {
    await dbConnect();
    
    const query = courseId ? { courseId } : {};
    
    // We populate the Idea to easily display titles
    const teams = await Team.find(query)
        .populate("courseId")
        .populate("ideaId")
        .sort({ createdAt: -1 })
        .lean();
        
    // Convert to plain JSON and resolve references safely
    return JSON.parse(JSON.stringify(teams));
}

export async function getGlobalTeamsBoard() {
    await dbConnect();
    
    const teams = await Team.find()
        .populate("courseId", "name")
        .populate("ideaId", "title description")
        .sort({ createdAt: -1 })
        .lean();
        
    return JSON.parse(JSON.stringify(teams));
}

// ---------------------------------------------------------------------
// Basic auth simulation for Student
// ---------------------------------------------------------------------

export async function checkStudentExists(studentId: string, courseId: string) {
    await dbConnect();
    
    const section = await Section.findOne({
        courseId: courseId,
        "students.studentId": studentId
    }).lean();

    if (!section) {
        return { exists: false, message: "Student not found in this course" };
    }

    const student = section.students.find((s: any) => s.studentId === studentId);
    return { exists: true, student: JSON.parse(JSON.stringify(student)) };
}

export async function getStudentTeam(courseId: string, studentId: string) {
    await dbConnect();
    
    const team = await Team.findOne({ courseId, members: studentId })
        .populate("ideaId")
        .lean();
        
    if (!team) return null;

    // Resolve names for all members
    const sections = await Section.find({ courseId }).lean();
    const allStudents: Record<string, string> = {};
    sections.forEach(sec => {
        sec.students.forEach((s: any) => {
            allStudents[s.studentId] = s.name;
        });
    });

    const membersWithNames = (team.members || []).map((id: string) => ({
        studentId: id,
        name: allStudents[id] || "Unknown Student"
    }));

    return JSON.parse(JSON.stringify({
        ...team,
        membersWithNames
    }));
}

export async function updateTeamMembers(teamId: string, memberIds: string[], isAdmin: boolean = false) {
    await dbConnect();
    
    const team = await Team.findById(teamId);
    if (!team) throw new Error("Team not found");

    const rules = await ProjectRule.findOne({ courseId: team.courseId }).lean();
    if (!rules) throw new Error("Rules not found");

    if (!isAdmin && memberIds.length > rules.maxTeamSize) {
        throw new Error(`Maximum team size is ${rules.maxTeamSize}`);
    }

    // Check if new members are already in other teams
    const newMembers = memberIds.filter(id => !team.members.includes(id));
    if (newMembers.length > 0) {
        const existing = await Team.findOne({ 
            courseId: team.courseId, 
            members: { $in: newMembers },
            _id: { $ne: teamId }
        }).lean();
        if (existing) throw new Error("One or more selected students are already in another team.");
    }

    team.members = memberIds;
    await team.save();
    
    revalidatePath(`/projects/${team.courseId}`);
    revalidatePath(`/projects/board`);
    return { success: true };
}

export async function deleteTeam(teamId: string, courseId: string) {
    await dbConnect();
    await Team.findByIdAndDelete(teamId);
    revalidatePath(`/admin/courses/${courseId}/projects`);
    revalidatePath(`/projects/${courseId}`);
    revalidatePath(`/projects/board`);
    return { success: true };
}

export async function getDetailedTeamsForCourse(courseId: string) {
    await dbConnect();
    const teams = await Team.find({ courseId }).populate("ideaId").lean();
    
    // Resolve names
    const sections = await Section.find({ courseId }).lean();
    const allStudents: Record<string, string> = {};
    sections.forEach(sec => {
        sec.students.forEach((s: any) => {
            allStudents[s.studentId] = s.name;
        });
    });

    const detailedTeams = teams.map((team: any) => ({
        ...team,
        membersWithNames: (team.members || []).map((id: string) => ({
            studentId: id,
            name: allStudents[id] || "Unknown Student"
        }))
    }));

    return JSON.parse(JSON.stringify(detailedTeams));
}

export async function updateTeamLeader(teamId: string, leaderId: string) {
    await dbConnect();
    const team = await Team.findById(teamId);
    if (!team) throw new Error("Team not found");
    
    // Ensure the new leader is actually a member of the team
    if (!team.members.includes(leaderId)) {
        throw new Error("New leader must be an existing member of the team.");
    }

    team.leaderId = leaderId;
    await team.save();
    
    revalidatePath(`/admin/courses/${team.courseId}/projects`);
    revalidatePath(`/projects/${team.courseId}`);
    return { success: true };
}

// ---------------------------------------------------------------------
// Student Admins Management (Main Admin)
// ---------------------------------------------------------------------

export async function addStudentAdmin(
    courseId: string, 
    studentId: string, 
    studentName: string, 
    username: string, 
    password: String, 
    appointedByTA: string
) {
    await dbConnect();
    
    // Check if username exists
    const existing = await StudentAdmin.findOne({ username });
    if (existing) throw new Error("Username already taken.");

    const newAdmin = await StudentAdmin.create({
        courseId,
        studentId,
        studentName,
        username,
        password,
        appointedByTA
    });

    revalidatePath(`/admin/courses/${courseId}/projects`);
    return JSON.parse(JSON.stringify(newAdmin));
}

export async function getStudentAdmins(courseId: string) {
    await dbConnect();
    const admins = await StudentAdmin.find({ courseId }).sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(admins));
}

export async function deleteStudentAdmin(adminId: string, courseId: string) {
    await dbConnect();
    await StudentAdmin.findByIdAndDelete(adminId);
    revalidatePath(`/admin/courses/${courseId}/projects`);
    return { success: true };
}

export async function studentAdminLogin(username: string, password: string, courseId: string) {
    await dbConnect();
    const admin = await StudentAdmin.findOne({ username, password, courseId }).lean();
    if (!admin) throw new Error("Invalid username/password or course access denied.");
    
    return JSON.parse(JSON.stringify({
        success: true,
        adminId: admin._id,
        studentName: admin.studentName,
        appointedByTA: admin.appointedByTA
    }));
}
