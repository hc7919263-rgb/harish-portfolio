import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { chatData, FAQ } from '../utils/chatData';
export type { FAQ };

// --- Types ---
export interface Project {
    title: string;
    description: string;
    url: string;
    skills: string[];
    category: 'Projects' | 'Handbooks' | 'Blogs' | 'Case Studies' | 'Research papers';
    status?: 'coming-soon';
    featured?: boolean;
}

export interface Academic {
    degree: string;
    institution: string;
    year: string;
    description: string;
}

export interface Certification {
    title: string;
    issuer: string;
    year: string;
    url?: string;
    image?: string;
}

export interface Activity {
    role: string;
    organization: string;
    year: string;
    description: string;
}


export interface Skill {
    name: string;
    percentage: number;
}
export interface SkillsData {
    technical: Skill[];
    soft: Skill[];
}

export interface FoundationData {
    academic: Academic[];
    certifications: Certification[];
    activities: Activity[];
}

export interface Collaboration {
    id: string;
    name: string;
    role?: string;
    imageUrl: string;
    url?: string;
}

interface DataContextType {
    projects: Project[];
    foundation: FoundationData;
    faqs: FAQ[];
    skills: SkillsData;
    collaborations: Collaboration[];
    meta: any; // Added meta for generic data like resume timestamp
    isLoading: boolean; // Added for performance tracking
    updateMeta: (key: string, value: any) => void;

    addProject: (project: Project) => void;
    updateProject: (index: number, project: Project) => void;
    deleteProject: (index: number) => void;

    addAcademic: (item: Academic) => void;
    updateAcademic: (index: number, item: Academic) => void;
    deleteAcademic: (index: number) => void;

    addCertification: (item: Certification) => void;
    updateCertification: (index: number, item: Certification) => void;
    deleteCertification: (index: number) => void;

    addActivity: (item: Activity) => void;
    updateActivity: (index: number, item: Activity) => void;
    deleteActivity: (index: number) => void;

    addFaq: (faq: FAQ) => void;
    updateFaq: (id: string, faq: FAQ) => void;
    deleteFaq: (id: string) => void;

    addSkill: (type: 'technical' | 'soft', skill: Skill) => void;
    updateSkill: (type: 'technical' | 'soft', index: number, skill: Skill) => void;
    deleteSkill: (type: 'technical' | 'soft', index: number) => void;

    addCollaboration: (collab: Collaboration) => void;
    updateCollaboration: (id: string, collab: Collaboration) => void;
    deleteCollaboration: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [foundation, setFoundation] = useState<FoundationData>({ academic: [], certifications: [], activities: [] });
    const [faqs, setFaqs] = useState<FAQ[]>(chatData.faqs);
    const [skills, setSkills] = useState<SkillsData>({
        technical: [
            { name: 'Python', percentage: 90 },
            { name: 'SQL', percentage: 80 }
        ],
        soft: []
    });
    const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
    const [meta, setMeta] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);

    // --- Persistence & Initial Load ---
    useEffect(() => {
        fetch('/api/data')
            .then(res => res.json())
            .then(data => {
                if (data.projects) setProjects(data.projects);
                if (data.foundation) setFoundation(data.foundation);
                if (data.faqs) setFaqs(data.faqs);
                if (data.skills) setSkills(data.skills);
                if (data.collaborations) setCollaborations(data.collaborations);
                if (data.meta) setMeta(data.meta);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to load data from server:", err);
                setIsLoading(false);
            });
    }, []);

    const saveToServer = (type: string, data: any) => {
        console.log(`[DataContext] Saving ${type} to server...`, data);
        const token = sessionStorage.getItem('admin_session_token');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        fetch('/api/save', {
            method: 'POST',
            headers,
            body: JSON.stringify({ type, data })
        })
            .then(res => {
                if (res.ok) console.log(`[DataContext] ${type} saved successfully`);
                else console.error(`[DataContext] Failed to save ${type}:`, res.statusText);
            })
            .catch(err => console.error(`[DataContext] Failed to save ${type}:`, err));
    };

    // --- Projects Handlers ---
    const addProject = (project: Project) => {
        setProjects(prev => {
            const newState = [project, ...prev];
            saveToServer('projects', newState);
            return newState;
        });
    };
    const updateProject = (index: number, project: Project) => {
        setProjects(prev => {
            const newState = prev.map((p, i) => i === index ? project : p);
            saveToServer('projects', newState);
            return newState;
        });
    };
    const deleteProject = (index: number) => {
        setProjects(prev => {
            const newState = prev.filter((_, i) => i !== index);
            saveToServer('projects', newState);
            return newState;
        });
    };

    // --- Foundation Handlers ---
    const addAcademic = (item: Academic) => {
        setFoundation(prev => {
            const newState = { ...prev, academic: [item, ...prev.academic] };
            saveToServer('foundation', newState);
            return newState;
        });
    };
    const updateAcademic = (index: number, item: Academic) => {
        setFoundation(prev => {
            const newState = { ...prev, academic: prev.academic.map((a, i) => i === index ? item : a) };
            saveToServer('foundation', newState);
            return newState;
        });
    };
    const deleteAcademic = (index: number) => {
        setFoundation(prev => {
            const newState = { ...prev, academic: prev.academic.filter((_, i) => i !== index) };
            saveToServer('foundation', newState);
            return newState;
        });
    };

    const addCertification = (item: Certification) => {
        setFoundation(prev => {
            const newState = { ...prev, certifications: [item, ...prev.certifications] };
            saveToServer('foundation', newState);
            return newState;
        });
    };
    const updateCertification = (index: number, item: Certification) => {
        setFoundation(prev => {
            const newState = { ...prev, certifications: prev.certifications.map((c, i) => i === index ? item : c) };
            saveToServer('foundation', newState);
            return newState;
        });
    };
    const deleteCertification = (index: number) => {
        setFoundation(prev => {
            const newState = { ...prev, certifications: prev.certifications.filter((_, i) => i !== index) };
            saveToServer('foundation', newState);
            return newState;
        });
    };

    const addActivity = (item: Activity) => {
        setFoundation(prev => {
            const newState = { ...prev, activities: [item, ...prev.activities] };
            saveToServer('foundation', newState);
            return newState;
        });
    };
    const updateActivity = (index: number, item: Activity) => {
        setFoundation(prev => {
            const newState = { ...prev, activities: prev.activities.map((ac, i) => i === index ? item : ac) };
            saveToServer('foundation', newState);
            return newState;
        });
    };
    const deleteActivity = (index: number) => {
        setFoundation(prev => {
            const newState = { ...prev, activities: prev.activities.filter((_, i) => i !== index) };
            saveToServer('foundation', newState);
            return newState;
        });
    };

    // --- FAQ Handlers ---
    const addFaq = (faq: FAQ) => {
        setFaqs(prev => {
            const newState = [faq, ...prev];
            saveToServer('faqs', newState);
            return newState;
        });
    };
    const updateFaq = (id: string, faq: FAQ) => {
        setFaqs(prev => {
            const newState = prev.map(f => f.id === id ? faq : f);
            saveToServer('faqs', newState);
            return newState;
        });
    };
    const deleteFaq = (id: string) => {
        setFaqs(prev => {
            const newState = prev.filter(f => f.id !== id);
            saveToServer('faqs', newState);
            return newState;
        });
    };

    // --- Skills Handlers ---
    const addSkill = (type: 'technical' | 'soft', skill: Skill) => {
        setSkills(prev => {
            const newList = [skill, ...prev[type]];
            const newState = { ...prev, [type]: newList };
            saveToServer('skills', newState);
            return newState;
        });
    };

    const updateSkill = (type: 'technical' | 'soft', index: number, skill: Skill) => {
        setSkills(prev => {
            const newList = prev[type].map((s, i) => i === index ? skill : s);
            const newState = { ...prev, [type]: newList };
            saveToServer('skills', newState);
            return newState;
        });
    };

    const deleteSkill = (type: 'technical' | 'soft', index: number) => {
        setSkills(prev => {
            const newList = prev[type].filter((_, i) => i !== index);
            const newState = { ...prev, [type]: newList };
            saveToServer('skills', newState);
            return newState;
        });
    };

    // --- Collaboration Handlers ---
    const addCollaboration = (collab: Collaboration) => {
        setCollaborations(prev => {
            const newState = [collab, ...prev];
            saveToServer('collaborations', newState);
            return newState;
        });
    };

    const updateCollaboration = (id: string, collab: Collaboration) => {
        setCollaborations(prev => {
            const newState = prev.map(c => c.id === id ? collab : c);
            saveToServer('collaborations', newState);
            return newState;
        });
    };

    const deleteCollaboration = (id: string) => {
        setCollaborations(prev => {
            const newState = prev.filter(c => c.id !== id);
            saveToServer('collaborations', newState);
            return newState;
        });
    };

    const updateMeta = (key: string, value: any) => {
        setMeta((prev: any) => {
            const newState = { ...prev, [key]: value };
            // We save the WHOLE meta object
            saveToServer('meta', newState); // Server expects 'meta' type to save to db.meta
            return newState;
        });
    };

    return (
        <DataContext.Provider value={{
            projects,
            foundation,
            faqs,
            skills,
            collaborations,
            meta,
            isLoading,
            updateMeta, // Added
            addProject, updateProject, deleteProject,
            addAcademic, updateAcademic, deleteAcademic,
            addCertification, updateCertification, deleteCertification,
            addActivity, updateActivity, deleteActivity,
            addFaq, updateFaq, deleteFaq,
            addSkill, updateSkill, deleteSkill,
            addCollaboration, updateCollaboration, deleteCollaboration
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
