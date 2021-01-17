import { hasPermission, userAuth } from "../../shared/backend/auth";
import { getResult, insertSingle, selectSingle, updateSingle } from "../../shared/backend/postgres";
import { setupServer } from "../../shared/backend/server";
import { IMarriage, IOtherPerson, IPerson } from "../shared/person";

const { apiRoute } = setupServer("family");

apiRoute.use(userAuth("family"));

apiRoute.get("/person/:uid", 
    hasPermission("family", "READER"), 
    selectSingle<IPerson>("family_person", {
        async enrich(person) {
            const wifes = await getResult<IMarriage>(
                `SELECT 
                    other.firstname AS other_firstname, 
                    other.lastname AS other_lastname, 
                    marriage.startdate AS startdate, 
                    marriage.enddate   AS enddate
                 FROM family_marriage AS marriage 
                 WHERE marriage.husband = :uid
                 INNER JOIN family_person AS other ON marriage.wife = other.uid`, 
                person.uid
            );

            const husbands = await getResult<IMarriage>(
                `SELECT 
                    other.firstname AS other_firstname, 
                    other.lastname AS other_lastname, 
                    marriage.startdate AS startdate, 
                    marriage.enddate   AS enddate
                 FROM family_marriage AS marriage 
                 WHERE marriage.wife = :uid
                 INNER JOIN family_person AS other ON marriage.husband = other.uid`, 
                person.uid
            );

            person.marriages = [...husbands, ...wifes];

            person.children = await getResult<IOtherPerson>(
                `SELECT
                    child.firstname AS firstname
                    child.lastname  AS lastname
                    child.uid       AS uid
                 FROM family_person_parent AS rel
                 WHERE rel.parent = :uid
                 LEFT JOIN family_person AS child ON rel.child = child.uid`,
                 person.uid
            );

            person.parents = await getResult<IOtherPerson>(
                `SELECT
                    parent.firstname AS firstname
                    parent.lastname  AS lastname
                    parent.uid       AS uid
                 FROM family_person_parent AS rel
                 WHERE rel.child = :uid
                 LEFT JOIN family_person AS parent ON rel.parent = parent.uid`,
                 person.uid
            );
        }
    })
);


apiRoute.put("/person", 
    hasPermission("family", "WRITER"), 
    insertSingle("family_person", "firstname", "lastname", "birthname", "birthdate", "deathdate")
);

apiRoute.patch("/person/:uid", 
    hasPermission("family", "WRITER"), 
    updateSingle("family_person", "firstname", "lastname", "birthname", "birthdate", "deathdate")
);

apiRoute.put("/parent", 
    hasPermission("family", "WRITER"), 
    insertSingle("family_person_parent", "parent", "child")
);

apiRoute.put("/marriage", 
    hasPermission("family", "WRITER"),
    insertSingle("family_person_marriage", "husband", "wife", "startdate", "enddate")
);
